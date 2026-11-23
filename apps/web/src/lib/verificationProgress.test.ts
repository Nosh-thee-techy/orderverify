/**
 * apps/web/src/lib/verificationProgress.test.ts
 * The tracker must follow real events. It must not mark later stages done
 * just because time has passed.
 */
import { describe, expect, it } from "vitest";
import { trackerFromEvents } from "./verificationProgress";

describe("trackerFromEvents", () => {
  it("marks received complete and reading active before any event", () => {
    const snap = trackerFromEvents([], "paying");
    expect(snap.stages.map((stage) => stage.tone)).toEqual([
      "complete",
      "active",
      "pending",
      "pending",
      "pending",
    ]);
    expect(snap.complete).toBe(false);
  });

  it("advances through parsed and requested without inventing payment or report", () => {
    const snap = trackerFromEvents([{ kind: "parsed" }, { kind: "requested" }], "paying");
    expect(snap.stages.map((stage) => `${stage.id}:${stage.tone}`)).toEqual([
      "received:complete",
      "reading:complete",
      "matching:complete",
      "paying:active",
      "report:pending",
    ]);
  });

  it("completes paying on settled, then waits for the report", () => {
    const snap = trackerFromEvents(
      [{ kind: "parsed" }, { kind: "requested" }, { kind: "payment_required" }, { kind: "signed" }, { kind: "settled" }],
      "paying",
    );
    expect(snap.stages.find((stage) => stage.id === "paying")?.tone).toBe("complete");
    expect(snap.stages.find((stage) => stage.id === "report")?.tone).toBe("active");
    expect(snap.complete).toBe(false);
  });

  it("treats bypass report_received as payment-step completion", () => {
    const snap = trackerFromEvents(
      [
        { kind: "parsed" },
        { kind: "requested" },
        { kind: "payment_required" },
        { kind: "report_received" },
      ],
      "done",
    );
    expect(snap.stages.every((stage) => stage.tone === "complete")).toBe(true);
    expect(snap.complete).toBe(true);
  });

  it("fails matching on cap_reached after parsed and leaves later stages pending", () => {
    const snap = trackerFromEvents([{ kind: "parsed" }, { kind: "cap_reached" }], "blocked_cap");
    expect(snap.failed).toBe(true);
    expect(snap.stages.map((stage) => `${stage.id}:${stage.tone}`)).toEqual([
      "received:complete",
      "reading:complete",
      "matching:failed",
      "paying:pending",
      "report:pending",
    ]);
  });

  it("fails paying when verify errors after the request", () => {
    const snap = trackerFromEvents(
      [{ kind: "parsed" }, { kind: "requested" }, { kind: "payment_required" }, { kind: "error" }],
      "error",
    );
    expect(snap.stages.find((stage) => stage.id === "paying")?.tone).toBe("failed");
    expect(snap.stages.find((stage) => stage.id === "report")?.tone).toBe("pending");
  });
});
