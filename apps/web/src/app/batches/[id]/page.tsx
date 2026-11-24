/**
 * apps/web/src/app/batches/[id]/page.tsx
 * Completed verification report for one batch. Same document the email and PDF use.
 */
"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { VerificationReport, type ReportPayload } from "@/components/VerificationReport";
import { useI18n } from "@/i18n";

/** Results for one batch, shown as the seller-facing report. */
export default function ResultsPage() {
  const params = useParams<{ id: string }>();
  const { t } = useI18n();
  const [data, setData] = useState<ReportPayload | null>(null);
  const [loaded, setLoaded] = useState(false);

  async function load() {
    const response = await fetch(`/api/batches/${params.id}`);
    if (response.ok) {
      const body = (await response.json()) as ReportPayload;
      if (body.report) setData(body);
    }
    setLoaded(true);
  }
  useEffect(() => {
    void load();
  }, [params.id]);

  if (!data) {
    return (
      <div className="mx-auto max-w-4xl">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-brand-ink">{t.results}</h1>
        <p className="mt-2 text-brand-muted">{loaded ? t.emptyToday : t.trackerReportBody}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <VerificationReport payload={data} />
    </div>
  );
}
