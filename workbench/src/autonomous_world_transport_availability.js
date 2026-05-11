(function (root, factory) {
  const api = factory(
    typeof require === "function" ? require("./artifact_identity.js") : root.OMIArtifactIdentity,
    typeof require === "function" ? require("./autonomous_world_transport_repair.js") : root.OMIAutonomousWorldTransportRepair
  );
  root.OMIAutonomousWorldTransportAvailability = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
}(typeof globalThis !== "undefined" ? globalThis : this, function (
  artifactIdentity,
  autonomousWorldTransportRepair
) {
  "use strict";

  function fnv1a(text) {
    return artifactIdentity.fnv1a(String(text || ""));
  }

  function stableString(value) {
    return artifactIdentity.stableString(value);
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function evidenceReceipt(evidence) {
    if (!evidence) return null;
    let receipt = null;
    if (evidence.kind === "omi.autonomous-world.transport-event") receipt = evidence.transport_event_receipt;
    if (evidence.kind === "omi.autonomous-world.transport-replay-log") receipt = evidence.transport_log_receipt;
    if (evidence.kind === "omi.autonomous-world.transport-checkpoint") receipt = evidence.checkpoint_receipt;
    if (evidence.kind === "omi.autonomous-world.transport-compaction-bundle") receipt = evidence.compaction_receipt;
    if (evidence.kind === "omi.autonomous-world.transport-repair-payload") receipt = evidence.repair_payload_receipt;
    receipt = receipt ||
      evidence.compaction_receipt ||
      evidence.checkpoint_receipt ||
      evidence.transport_log_receipt ||
      evidence.transport_event_receipt ||
      evidence.repair_payload_receipt ||
      fnv1a(stableString(evidence));
    return String(receipt);
  }

  function evidenceKind(evidence) {
    if (!evidence) return "unknown";
    if (evidence.kind === "omi.autonomous-world.transport-event" || evidence.transport_event_receipt) return "transport-event";
    if (evidence.kind === "omi.autonomous-world.transport-replay-log" || evidence.transport_log_receipt) return "transport-log";
    if (evidence.kind === "omi.autonomous-world.transport-checkpoint" || evidence.checkpoint_receipt) return "checkpoint";
    if (evidence.kind === "omi.autonomous-world.transport-compaction-bundle" || evidence.compaction_receipt) return "compaction-bundle";
    return String(evidence.kind || "unknown");
  }

  function normalizeInventory(input) {
    return {
      evidence: (input && input.evidence || []).map(clone),
      suppliers: (input && input.suppliers || []).map(clone)
    };
  }

  function supplierReceipt(supplier) {
    return fnv1a(stableString({
      peer_id: supplier.peer_id,
      package_receipt: supplier.package_receipt || null,
      provides: (supplier.provides || []).map(String).sort(),
      authority: false
    }));
  }

  function classifyEvidence(receiptKey, receiptValue, inventory, corruptReceipts) {
    const found = inventory.evidence.find(function (item) {
      return evidenceReceipt(item) === receiptKey;
    });
    if (found && corruptReceipts.indexOf(receiptKey) >= 0) {
      return {
        receipt: receiptValue,
        target_kind: evidenceKind(found),
        status: "corrupt",
        evidence: found,
        authority: false
      };
    }
    if (found) {
      return {
        receipt: receiptValue,
        target_kind: evidenceKind(found),
        status: "available",
        evidence: found,
        authority: false
      };
    }
    return {
      receipt: receiptValue,
      target_kind: "unknown",
      status: "missing",
      evidence: null,
      authority: false
    };
  }

  function supplierMatches(receipt, inventory) {
    return inventory.suppliers.filter(function (supplier) {
      return (supplier.provides || []).map(String).indexOf(receipt) >= 0;
    }).map(function (supplier) {
      return {
        peer_id: String(supplier.peer_id || "peer.unknown"),
        package_receipt: supplier.package_receipt || null,
        provides: (supplier.provides || []).map(String).sort(),
        authority: false,
        supplier_receipt: supplier.supplier_receipt || supplierReceipt(supplier)
      };
    }).sort(function (a, b) {
      return a.peer_id.localeCompare(b.peer_id);
    });
  }

  function createAvailabilityReport(input) {
    const inventory = normalizeInventory(input && input.inventory);
    const required = (input && input.required_receipts || []).map(function (receipt) {
      return { key: String(receipt), value: receipt };
    }).sort(function (a, b) {
      return a.key.localeCompare(b.key);
    });
    const corruptReceipts = (input && input.corrupt_receipts || []).map(String).sort();
    const classified = required.map(function (receipt) {
      const record = classifyEvidence(receipt.key, receipt.value, inventory, corruptReceipts);
      const suppliers = supplierMatches(receipt.key, inventory);
      if ((record.status === "missing" || record.status === "corrupt") && suppliers.length) {
        record.status = "repairable";
      }
      record.candidate_suppliers = suppliers;
      delete record.evidence;
      return record;
    });
    const report = {
      kind: "omi.autonomous-world.transport-availability",
      authority: false,
      required_receipts: required.map((receipt) => receipt.value),
      available: classified.filter((record) => record.status === "available"),
      missing: classified.filter((record) => record.status === "missing"),
      corrupt: classified.filter((record) => record.status === "corrupt"),
      repairable: classified.filter((record) => record.status === "repairable"),
      candidate_suppliers: classified.reduce(function (acc, record) {
        record.candidate_suppliers.forEach(function (supplier) {
          if (!acc.some((item) => item.supplier_receipt === supplier.supplier_receipt && item.target_receipt === record.receipt)) {
            acc.push(Object.assign({ target_receipt: record.receipt }, supplier));
          }
        });
        return acc;
      }, []),
      availability_receipt: null
    };
    report.availability_receipt = fnv1a(stableString({
      required_receipts: report.required_receipts,
      available: report.available.map((record) => record.receipt),
      missing: report.missing.map((record) => record.receipt),
      corrupt: report.corrupt.map((record) => record.receipt),
      repairable: report.repairable.map((record) => record.receipt),
      candidate_suppliers: report.candidate_suppliers.map((supplier) => supplier.supplier_receipt + ":" + supplier.target_receipt).sort(),
      authority: report.authority
    }));
    return report;
  }

  function buildRepairPlan(reportInput, supplierPayloads) {
    const report = clone(reportInput || {});
    const payloads = (supplierPayloads || []).map(clone);
    const actions = (report.repairable || []).map(function (record) {
      const payload = payloads.find(function (candidate) {
        return candidate.target_receipt === record.receipt;
      });
      const issue = {
        target_receipt: record.receipt,
        target_kind: record.target_kind === "unknown" ? "transport-event" : record.target_kind,
        reason: "availability-repairable",
        authority: false
      };
      const request = autonomousWorldTransportRepair.createRepairRequest(issue);
      return {
        kind: "omi.autonomous-world.transport-availability-repair-action",
        target_receipt: record.receipt,
        target_kind: request.target_kind,
        repair_request: request,
        candidate_suppliers: record.candidate_suppliers || [],
        repair_payload: payload || null,
        authority: false
      };
    });
    const plan = {
      kind: "omi.autonomous-world.transport-availability-repair-plan",
      authority: false,
      availability_receipt: report.availability_receipt || null,
      actions: actions,
      repair_plan_receipt: null
    };
    plan.repair_plan_receipt = fnv1a(stableString({
      availability_receipt: plan.availability_receipt,
      actions: actions.map(function (action) {
        return {
          target_receipt: action.target_receipt,
          target_kind: action.target_kind,
          repair_request_receipt: action.repair_request.repair_request_receipt,
          repair_payload_receipt: action.repair_payload ? action.repair_payload.repair_payload_receipt : null,
          suppliers: action.candidate_suppliers.map((supplier) => supplier.supplier_receipt).sort()
        };
      }),
      authority: plan.authority
    }));
    return plan;
  }

  function executeRepairPlan(registry, evidenceInput, planInput, subscriptionInput) {
    const plan = clone(planInput || {});
    const payloads = (plan.actions || []).map(function (action) {
      return action.repair_payload;
    }).filter(Boolean);
    return autonomousWorldTransportRepair.repairAndReplay(
      registry,
      evidenceInput,
      payloads,
      subscriptionInput
    );
  }

  function openAvailabilitySnapshot() {
    throw new Error("availability-not-admission");
  }

  return {
    createAvailabilityReport: createAvailabilityReport,
    buildRepairPlan: buildRepairPlan,
    executeRepairPlan: executeRepairPlan,
    openAvailabilitySnapshot: openAvailabilitySnapshot
  };
}));
