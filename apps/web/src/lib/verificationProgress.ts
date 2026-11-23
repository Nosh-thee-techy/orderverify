/**
 * apps/web/src/lib/verificationProgress.ts
 * Maps real agent events onto the five visual tracker stages.
 * A later stage is never marked complete unless the matching event (or a
 * terminal success status) has actually arrived.
 */

export const TRACKER_STAGES = ["received", "reading", "matching", "paying", "report"] as const;

export type TrackerStageId = (typeof TRACKER_STAGES)[number];

export type TrackerTone = "pending" | "active" | "complete" | "failed";

export interface TrackerStageState {
  id: TrackerStageId;
  tone: TrackerTone;
}

export interface TrackerSnapshot {
  stages: TrackerStageState[];
  failed: boolean;
  complete: boolean;
  /** Index of the connector that should fill (0 = between stage 1 and 2). -1 if none. */
  filledConnectors: number;
}

const FAIL_KINDS = new Set(["error", "cap_reached", "paused"]);

/**
 * Derive tracker state from the events the agent has actually emitted.
 *
 * The batch already exists when the activity page opens, so "received" is
 * complete immediately. Later stages follow parsed → requested →
 * settled/report_received → report_received. Bypass runs have no `settled`
 * event; `report_received` is what proves the payment step finished.
 *
 * @param events - Timeline rows in arrival order
 * @param batchStatus - Current batch status from the events API
 * @returns Stage tones the UI can render without inventing progress
 */
export function trackerFromEvents(
  events: { kind: string }[],
  batchStatus: string,
): TrackerSnapshot {
  const kinds = new Set(events.map((event) => event.kind));
  const success = batchStatus === "done" || kinds.has("report_received") || kinds.has("held");
  const failed =
    !success &&
    (batchStatus === "error" ||
      batchStatus === "blocked_cap" ||
      events.some((event) => FAIL_KINDS.has(event.kind)));

  const done: Record<TrackerStageId, boolean> = success
    ? { received: true, reading: true, matching: true, paying: true, report: true }
    : {
        received: true,
        reading: kinds.has("parsed"),
        matching: kinds.has("requested"),
        paying: kinds.has("settled") || kinds.has("report_received"),
        report: kinds.has("report_received") || kinds.has("held"),
      };

  const failId: TrackerStageId | null = failed ? firstIncomplete(done) : null;
  const activeId: TrackerStageId | null = failed ? null : firstIncomplete(done);

  const stages: TrackerStageState[] = TRACKER_STAGES.map((id) => {
    if (done[id]) return { id, tone: "complete" };
    if (failId === id) return { id, tone: "failed" };
    if (activeId === id) return { id, tone: "active" };
    return { id, tone: "pending" };
  });

  const completeCount = stages.filter((stage) => stage.tone === "complete").length;
  const filledConnectors = Math.max(0, completeCount - 1);

  return {
    stages,
    failed,
    complete: success,
    filledConnectors,
  };
}

function firstIncomplete(done: Record<TrackerStageId, boolean>): TrackerStageId | null {
  return TRACKER_STAGES.find((id) => !done[id]) ?? null;
}
