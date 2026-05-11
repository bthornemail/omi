(function (root, factory) {
  const api = factory(
    typeof require === "function" ? require("./artifact_identity.js") : root.OMIArtifactIdentity,
    typeof require === "function" ? require("./autonomous_world_transport_repair.js") : root.OMIAutonomousWorldTransportRepair
  );
  root.OMIAutonomousWorldTransportRequestScheduler = api;
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

  function normalizePolicy(input) {
    const policy = input && typeof input === "object" ? clone(input) : {};
    return {
      policy_id: String(policy.policy_id || policy.name || "deterministic.fixture"),
      order: (policy.order || ["corrupt", "missing", "repairable"]).map(String),
      supplier_order: String(policy.supplier_order || "peer-id"),
      max_requests: policy.max_requests === undefined ? null : Number(policy.max_requests),
      retry_limit: policy.retry_limit === undefined ? 0 : Number(policy.retry_limit),
      authority: false
    };
  }

  function priorityFor(status, policy) {
    const index = policy.order.indexOf(status);
    return index < 0 ? policy.order.length : index;
  }

  function supplierSort(policy) {
    return function (a, b) {
      if (policy.supplier_order === "supplier-receipt") {
        return String(a.supplier_receipt || "").localeCompare(String(b.supplier_receipt || ""));
      }
      if (policy.supplier_order === "package-receipt") {
        const packageCmp = String(a.package_receipt || "").localeCompare(String(b.package_receipt || ""));
        if (packageCmp) return packageCmp;
      }
      return String(a.peer_id || "").localeCompare(String(b.peer_id || ""));
    };
  }

  function makeRequest(recordInput, status, policy, index) {
    const record = clone(recordInput || {});
    const suppliers = (record.candidate_suppliers || []).map(function (supplier) {
      return Object.assign({}, clone(supplier), {
        authority: false,
        priority_is_trust: false
      });
    }).sort(supplierSort(policy));
    const request = {
      kind: "omi.autonomous-world.transport-request",
      authority: false,
      admission: false,
      target_receipt: record.receipt,
      target_kind: String(record.target_kind || "transport-event"),
      reason: status === "corrupt" ? "corrupt" : status,
      candidate_suppliers: suppliers,
      supplier_priority_is_trust: false,
      priority: priorityFor(status, policy),
      order: index,
      retry_limit: policy.retry_limit,
      dispatch: false,
      request_receipt: null
    };
    request.request_receipt = fnv1a(stableString({
      target_receipt: request.target_receipt,
      target_kind: request.target_kind,
      reason: request.reason,
      suppliers: request.candidate_suppliers.map(function (supplier) {
        return {
          peer_id: supplier.peer_id,
          package_receipt: supplier.package_receipt || null,
          supplier_receipt: supplier.supplier_receipt || null,
          authority: supplier.authority
        };
      }),
      priority: request.priority,
      order: request.order,
      retry_limit: request.retry_limit,
      authority: request.authority,
      admission: request.admission,
      dispatch: request.dispatch
    }));
    return request;
  }

  function createRequestSchedule(availabilityInput, policyInput) {
    const availability = clone(availabilityInput || {});
    const policy = normalizePolicy(policyInput);
    const needs = [];
    ["corrupt", "missing", "repairable"].forEach(function (status) {
      (availability[status] || []).forEach(function (record) {
        needs.push({ status: status, record: record });
      });
    });
    needs.sort(function (a, b) {
      const priorityDiff = priorityFor(a.status, policy) - priorityFor(b.status, policy);
      if (priorityDiff) return priorityDiff;
      return String(a.record.receipt).localeCompare(String(b.record.receipt));
    });
    const limited = policy.max_requests === null ? needs : needs.slice(0, policy.max_requests);
    const requests = limited.map(function (item, index) {
      return makeRequest(item.record, item.status, policy, index);
    });
    const unsatisfied = requests.filter(function (request) {
      return !request.candidate_suppliers.length;
    }).map(function (request) {
      return {
        target_receipt: request.target_receipt,
        target_kind: request.target_kind,
        reason: request.reason,
        request_receipt: request.request_receipt,
        authority: false
      };
    });
    const schedule = {
      kind: "omi.autonomous-world.transport-request-schedule",
      authority: false,
      admission: false,
      dispatch: false,
      source_availability_receipt: availability.availability_receipt || null,
      policy: policy,
      requests: requests,
      unsatisfied: unsatisfied,
      schedule_receipt: null
    };
    schedule.schedule_receipt = fnv1a(stableString({
      source_availability_receipt: schedule.source_availability_receipt,
      policy: schedule.policy,
      requests: schedule.requests.map(function (request) {
        return {
          target_receipt: request.target_receipt,
          target_kind: request.target_kind,
          reason: request.reason,
          supplier_receipts: request.candidate_suppliers.map((supplier) => supplier.supplier_receipt || null),
          priority: request.priority,
          order: request.order,
          request_receipt: request.request_receipt
        };
      }),
      unsatisfied: schedule.unsatisfied.map((record) => record.request_receipt),
      authority: schedule.authority,
      admission: schedule.admission,
      dispatch: schedule.dispatch
    }));
    return schedule;
  }

  function buildScheduledRepairPlan(scheduleInput, supplierPayloads) {
    const schedule = clone(scheduleInput || {});
    const payloads = (supplierPayloads || []).map(clone);
    const actions = (schedule.requests || []).map(function (request) {
      const payload = payloads.find(function (candidate) {
        return candidate.target_receipt === request.target_receipt;
      });
      const repairRequest = autonomousWorldTransportRepair.createRepairRequest({
        target_receipt: request.target_receipt,
        target_kind: request.target_kind === "unknown" ? "transport-event" : request.target_kind,
        reason: "scheduled-" + request.reason,
        authority: false
      });
      return {
        kind: "omi.autonomous-world.transport-scheduled-repair-action",
        authority: false,
        admission: false,
        dispatch: false,
        request_receipt: request.request_receipt,
        target_receipt: request.target_receipt,
        target_kind: repairRequest.target_kind,
        repair_request: repairRequest,
        candidate_suppliers: request.candidate_suppliers || [],
        repair_payload: payload || null
      };
    });
    const plan = {
      kind: "omi.autonomous-world.transport-scheduled-repair-plan",
      authority: false,
      admission: false,
      dispatch: false,
      schedule_receipt: schedule.schedule_receipt || null,
      actions: actions,
      scheduled_repair_plan_receipt: null
    };
    plan.scheduled_repair_plan_receipt = fnv1a(stableString({
      schedule_receipt: plan.schedule_receipt,
      actions: actions.map(function (action) {
        return {
          request_receipt: action.request_receipt,
          target_receipt: action.target_receipt,
          target_kind: action.target_kind,
          repair_request_receipt: action.repair_request.repair_request_receipt,
          repair_payload_receipt: action.repair_payload ? action.repair_payload.repair_payload_receipt : null,
          supplier_receipts: action.candidate_suppliers.map((supplier) => supplier.supplier_receipt || null).sort()
        };
      }),
      authority: plan.authority,
      admission: plan.admission,
      dispatch: plan.dispatch
    }));
    return plan;
  }

  function executeScheduledRepair(registry, evidenceInput, planInput, subscriptionInput) {
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

  function openScheduledSnapshot() {
    throw new Error("schedule-not-admission");
  }

  return {
    createRequestSchedule: createRequestSchedule,
    buildScheduledRepairPlan: buildScheduledRepairPlan,
    executeScheduledRepair: executeScheduledRepair,
    openScheduledSnapshot: openScheduledSnapshot
  };
}));
