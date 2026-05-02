# OMI: A Pre-OS Measurement Machine

Normalized law: [OMI Pre-OS Canonical Measurement Law](PRE-OS-CANONICAL-MEASUREMENT-LAW.md).

## One Sentence

OMI interprets a canonical raw binary framed image: ASCII `0x00..0x1F` as
hidden CONS structure, `0x20..0x2F` as measurement operators, `0x30..0x3F` as
the first visible measurement outputs, and `0x40..0x7F` as optional user-space
projection. No OS, no alphabet, and no user space is assumed.

## The Framed Image

The machine begins with a single raw binary image in memory. That image is
partitioned by ASCII range:

| Range | Interpretation |
|-------|----------------|
| `0x00..0x1F` | Hidden CONS-level structure, cells not text |
| `0x20..0x2F` | Measurement operators: CONS, dot, group, lenses |
| `0x30..0x3F` | Canonical measurement codomain, digits as stable outputs |
| `0x40..0x7F` | Optional user-space projection, alphabet as later interpretation |

No other interpretation exists at boot. No OS loads. No alphabet is presumed.

## The Measurement Law

```text
for every framed image I
for every measurement operator op in 0x20..0x2F:
    apply(op, I) -> digit d in 0x30..0x3F
```

Where `apply` is deterministic and `d` is the first visible fact emerging from
hidden structure.

Digits are not numbers. Digits are stable measurement marks.

## The Hidden Structure

The control band is not treated as text. In OMI, it is interpreted as hidden
CONS-level structure:

| Byte/range | OMI interpretation |
|------------|--------------------|
| `0x00` NUL | empty cell / null structure |
| `0x01..0x1A` | structural variables |
| `0x1B` ESC | measurement gate selector |
| `0x1C..0x1F` | projection axes: FS, GS, RS, US |

These are invisible to user space. They are the machine's internal geometry.

## The Measurement Operators

| Operator | Role |
|----------|------|
| `&` (`0x26`) | CONS / pair constructor |
| `.` (`0x2E`) | dot / projection path |
| `/` (`0x2F`) | solidus / traversal ratio |
| `(` `)` | grouping |
| `+` `,` | sequence / concatenation |

These are the lenses. They measure hidden structure and produce digits.

## The Visible Output

Digits `0..9` (`0x30..0x39`) are the first visible things. They are not yet
numbers. They may be read as:

| Lens | Reading |
|------|---------|
| topological | class descriptor, such as triangle = `3` |
| positional | coefficient display |
| precision | structural-distance measurement |
| geometric | stable invariant of hidden structure |

Boundary operators `: ; < = > ?` (`0x3A..0x3F`) extend digits into relation,
boundary, and probe roles.

## ESC as Gate Selector

`0x1B` (ESC) selects or gates the active measurement lens:

```text
ESC + mode -> active projection regime
```

Different regimes may produce different digits from the same hidden structure.

## The Pre-OS Stack

| Layer | OMI interpretation |
|-------|--------------------|
| Hardware | raw memory containing `0x00..0x1F` structure |
| Measurement | apply operators `0x20..0x2F` to structure |
| First visible | digits `0x30..0x3F` appear |
| Projection | map digits to alphabet `0x40..0x7F`, optional |
| OS | projection of a projection, optional |

No OS is required. No user space is required. No alphabet is assumed.

## The Inverse-Square / Golomb Precision Law

Precision is not stored first as a user-space number. Precision is derived from
structural distance:

```text
precision(depth) = 1 / (1 + depth)^2
```

Where `depth` is nesting depth in hidden CONS structure and `precision` is
measurement resolution.

Golomb-like coding may compress this precision ladder into a compact stream.
That stream is a projection format, not execution authority.

## The Final Invariant

```text
for every measurement operator op
for every hidden structure S within 0x00..0x1F:
    apply(op, S) is in 0x30..0x3F
    and the result is deterministic, replayable, and OS-independent
```

Digits are measurements. Numbers come later, as user-space interpretations of
those measurements.

## Codex Entry

OMI is a pre-OS measurement machine over ASCII. It treats `0x00..0x1F` as
hidden CONS structure, `0x20..0x2F` as measurement operators, and `0x30..0x3F`
as the first visible measurement outputs. No OS, no alphabet, and no user space
is assumed. Digits are measurements, not numbers.
