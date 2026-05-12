;;; org-omi-pinch.el --- Repo-native org-omi pinch point -*- lexical-binding: t; -*-

(require 'cl-lib)
(require 'json)
(require 'org)
(require 'subr-x)

(defgroup org-omi nil
  "Literate OMI declaration pinch point."
  :group 'tools)

(defcustom org-omi-binary-path
  (expand-file-name "build/omi-blob" (or (getenv "OMI_REPO_ROOT") default-directory))
  "Path to the OMIB CLI binary."
  :type 'string
  :group 'org-omi)

(defcustom org-omi-export-script
  (expand-file-name "tools/org_omi_export.js" (or (getenv "OMI_REPO_ROOT") default-directory))
  "Path to the Node exporter for Markdown/Canvas/manifest outputs."
  :type 'string
  :group 'org-omi)

(defcustom org-omi-node-binary "node"
  "Node runtime used for projection export."
  :type 'string
  :group 'org-omi)

(defcustom org-omi-tangle-root "declarations/"
  "Root directory for tangled OMI declarations and projection artifacts."
  :type 'directory
  :group 'org-omi)

(defcustom org-omi-receipt-key "OMI_RECEIPT"
  "Org keyword used to mirror the declaration receipt."
  :type 'string
  :group 'org-omi)

(defcustom org-omi-surface-digest-key "OMI_SURFACE_DIGEST"
  "Org keyword used to mirror the surface digest."
  :type 'string
  :group 'org-omi)

(defcustom org-omi-auto-surface-digest nil
  "When non-nil, compute SHA-256 over the full Org surface."
  :type 'boolean
  :group 'org-omi)

(defcustom org-omi-enable-blob nil
  "When non-nil, emit OMIB carriers after tangling."
  :type 'boolean
  :group 'org-omi)

(defun org-omi--repo-root ()
  (or (locate-dominating-file default-directory "AGENTS.md")
      default-directory))

(defun org-omi--get-front-matter (key)
  (save-excursion
    (goto-char (point-min))
    (let ((case-fold-search nil)
          (re (format "^#\\+%s:[ \t]*\\(.*\\)$" (regexp-quote key))))
      (when (re-search-forward re nil t)
        (string-trim (match-string-no-properties 1))))))

(defun org-omi--extract-omi-blocks ()
  (let (blocks)
    (org-element-map (org-element-parse-buffer) 'src-block
      (lambda (block)
        (when (string= (org-element-property :language block) "omi")
          (push (string-trim (org-element-property :value block)) blocks))))
    (nreverse blocks)))

(defun org-omi--validate-envelope (text)
  (let ((trimmed (string-trim text)))
    (unless (string-match-p "\\`(omi\\(?:.\\|\n\\)*?)\\'" trimmed)
      (user-error "OMI block must use a top-level (omi ...) envelope"))
    (let ((balance 0))
      (mapc (lambda (ch)
              (cond
               ((eq ch ?\() (setq balance (1+ balance)))
               ((eq ch ?\)) (setq balance (1- balance)))))
            trimmed)
      (unless (zerop balance)
        (user-error "OMI block has unbalanced parentheses")))
    trimmed))

(defun org-omi--normalized-declaration ()
  (let ((blocks (org-omi--extract-omi-blocks)))
    (unless blocks
      (user-error "No omi source blocks found"))
    (mapconcat #'org-omi--validate-envelope blocks "\n\n")))

(defun org-omi--fnv1a32 (content)
  (let ((hash #x811c9dc5)
        (prime #x01000193)
        (bytes (encode-coding-string content 'utf-8 t)))
    (cl-loop for i from 0 below (length bytes)
             for b = (aref bytes i)
             do (setq hash (logxor hash b))
             do (setq hash (logand #xffffffff (* hash prime))))
    (format "fnv1a32:%08x" hash)))

(defun org-omi--surface-digest ()
  (secure-hash 'sha256 (buffer-string)))

(defun org-omi--write-keyword (key value)
  (save-excursion
    (goto-char (point-min))
    (let ((case-fold-search nil)
          (re (format "^#\\+%s:.*$" (regexp-quote key))))
      (if (re-search-forward re nil t)
          (replace-match (format "#+%s: %s" key value) t t)
        (goto-char (point-min))
        (insert (format "#+%s: %s\n" key value))))))

(defun org-omi--safe-id-to-file-name (omi-id)
  (replace-regexp-in-string "[^A-Za-z0-9._-]" "_" omi-id))

(defun org-omi--effective-tangle-root ()
  (expand-file-name
   (or (org-omi--get-front-matter "OMI_TANGLE_ROOT")
       org-omi-tangle-root)
   (file-name-directory (or buffer-file-name default-directory))))

(defun org-omi--write-declaration-file (omi-id declaration tangle-root)
  (let* ((safe (org-omi--safe-id-to-file-name omi-id))
         (path (expand-file-name (concat safe ".omi") tangle-root)))
    (make-directory tangle-root t)
    (with-temp-file path
      (insert declaration)
      (insert "\n"))
    path))

(defun org-omi--blob-receipt-for-file (omi-file)
  (with-temp-buffer
    (let ((status (call-process org-omi-binary-path nil t nil "receipt" omi-file)))
      (unless (zerop status)
        (user-error "omi-blob receipt failed for %s" omi-file))
      (string-trim (buffer-string)))))

(defun org-omi--call-blob-encoder (omi-file blob-file receipt-file)
  (let ((exit (call-process org-omi-binary-path nil nil nil
                            "encode" omi-file blob-file receipt-file)))
    (unless (zerop exit)
      (user-error "omi-blob encode failed with exit code %s" exit))))

(defun org-omi--export-projections (blob-receipt tangle-root)
  (let ((args (list org-omi-export-script buffer-file-name tangle-root)))
    (when org-omi-auto-surface-digest
      (setq args (append args '("--surface-digest"))))
    (when blob-receipt
      (setq args (append args (list "--blob-receipt" blob-receipt))))
    (with-temp-buffer
      (let ((status (apply #'call-process org-omi-node-binary nil t nil args)))
        (unless (zerop status)
          (user-error "org-omi projection export failed"))
        (goto-char (point-min))
        (json-parse-buffer :object-type 'alist)))))

(defun org-omi--manifest-file (omi-id tangle-root)
  (expand-file-name (concat (org-omi--safe-id-to-file-name omi-id) ".manifest.json") tangle-root))

;;;###autoload
(defun org-omi-pinch-tangle-and-receipt ()
  "Tangle current Org buffer, compute declaration receipt, and optionally emit OMIB."
  (interactive)
  (unless (derived-mode-p 'org-mode)
    (user-error "Not in org-mode"))
  (let* ((omi-id (org-omi--get-front-matter "OMI_ID"))
         (declaration (org-omi--normalized-declaration))
         (tangle-root (org-omi--effective-tangle-root)))
    (unless omi-id
      (user-error "Buffer missing #+OMI_ID front matter"))
    (let* ((declaration-receipt (org-omi--fnv1a32 declaration))
           (omi-file (org-omi--write-declaration-file omi-id declaration tangle-root))
           (safe (org-omi--safe-id-to-file-name omi-id))
           (blob-file (expand-file-name (concat safe ".blob") tangle-root))
           (blob-receipt-file (expand-file-name (concat safe ".blob.receipt") tangle-root))
           (surface-digest (when org-omi-auto-surface-digest (org-omi--surface-digest)))
           (blob-receipt nil))
      (org-omi--write-keyword org-omi-receipt-key declaration-receipt)
      (when surface-digest
        (org-omi--write-keyword org-omi-surface-digest-key surface-digest))
      (when org-omi-enable-blob
        (unless (file-executable-p org-omi-binary-path)
          (user-error "Cannot execute OMIB CLI: %s" org-omi-binary-path))
        (org-omi--call-blob-encoder omi-file blob-file blob-receipt-file)
        (setq blob-receipt (string-trim (with-temp-buffer
                                          (insert-file-contents blob-receipt-file)
                                          (buffer-string)))))
      (org-omi--export-projections blob-receipt tangle-root)
      (message "org-omi: receipt %s manifest %s"
               declaration-receipt
               (org-omi--manifest-file omi-id tangle-root))
      declaration-receipt)))

;;;###autoload
(defun org-omi-pinch-verify ()
  "Verify current buffer's normalized declaration against #+OMI_RECEIPT."
  (interactive)
  (let ((current (org-omi--get-front-matter org-omi-receipt-key))
        (computed (org-omi--fnv1a32 (org-omi--normalized-declaration))))
    (cond
     ((not current)
      (user-error "No #+%s present" org-omi-receipt-key))
     ((string= current computed)
      (message "org-omi: receipt verified %s" computed)
      t)
     (t
      (user-error "org-omi: receipt mismatch current=%s computed=%s" current computed)))))

;;;###autoload
(defun org-omi-pinch-export-to-osi ()
  "Export Markdown, Canvas, and manifest projections for the current Org buffer."
  (interactive)
  (unless buffer-file-name
    (user-error "Buffer must be visiting a file"))
  (let* ((omi-id (or (org-omi--get-front-matter "OMI_ID")
                     (user-error "Buffer missing #+OMI_ID front matter")))
         (tangle-root (org-omi--effective-tangle-root))
         (result (org-omi--export-projections nil tangle-root)))
    (message "org-omi: exported %s %s %s"
             (alist-get 'markdown result)
             (alist-get 'canvas result)
             (alist-get 'manifest result))
    (org-omi--manifest-file omi-id tangle-root)))

(provide 'org-omi-pinch)
