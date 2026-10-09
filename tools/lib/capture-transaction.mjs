const ARTIFACT_DEPTH_KEYS = Object.freeze({
  "non-governance": "non_governance",
  "pending-hh": "pending_hh",
});

const DEPTH_RANK = Object.freeze({ micro: 0, light: 1, standard: 2, full: 3 });

function requireString(value, label) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${label} must be a non-empty string`);
  }
  return value.trim();
}

function validateParking(parking) {
  if (!parking || typeof parking !== "object") throw new Error("significant_discovery_parking is unavailable");
  if (!Array.isArray(parking.triggers)) throw new Error("significant_discovery_parking.triggers is unavailable");
  const transaction = parking.transaction;
  if (!transaction || typeof transaction !== "object") throw new Error("capture transaction contract is unavailable");
  if (!transaction.depth_by_artifact || typeof transaction.depth_by_artifact !== "object") {
    throw new Error("capture depth contract is unavailable");
  }
  return transaction;
}

export function planCaptureTransaction(parking, input = {}) {
  const transaction = validateParking(parking);
  const trigger = requireString(input.trigger, "trigger");
  if (!parking.triggers.includes(trigger)) throw new Error(`unknown significant-discovery trigger: ${trigger}`);

  const artifactType = requireString(input.artifactType, "artifact type");
  const depthKey = ARTIFACT_DEPTH_KEYS[artifactType];
  if (!depthKey) throw new Error(`unknown capture artifact type: ${artifactType}`);
  const captureDepth = transaction.depth_by_artifact[depthKey];
  if (!Object.hasOwn(DEPTH_RANK, captureDepth)) throw new Error(`invalid configured capture depth: ${captureDepth}`);

  const capturedArtifact = requireString(input.capturedArtifact, "captured artifact");
  let disposition = "separate-task";
  let captureTaskId = "pending";
  let sourceTaskId = "none";

  if (input.currentTask !== undefined && input.currentTask !== null) {
    const currentTask = input.currentTask;
    const currentTaskId = requireString(currentTask.id, "current task id");
    const currentDepth = requireString(currentTask.depth, "current task depth");
    if (!Object.hasOwn(DEPTH_RANK, currentDepth)) throw new Error(`unknown current task depth: ${currentDepth}`);
    sourceTaskId = currentTaskId;
    const canFold = DEPTH_RANK[currentDepth] >= DEPTH_RANK[captureDepth]
      && currentDepth !== "micro"
      && currentDepth !== "light"
      && currentTask.scopeIncluded === true
      && currentTask.writeOverlap !== true;
    if (canFold) {
      disposition = "fold-current-task";
      captureTaskId = currentTaskId;
    }
  }

  return {
    trigger,
    artifact_type: artifactType,
    capture_task_id: captureTaskId,
    capture_depth: captureDepth,
    captured_artifact: capturedArtifact,
    remediation_task_id: "pending",
    source_task_id: sourceTaskId,
    disposition,
    remediation_in_capture: false,
    consumer_activation: artifactType === "pending-hh"
      ? "inactive-until-approved-and-separate-implementation-task"
      : "not-applicable",
  };
}
