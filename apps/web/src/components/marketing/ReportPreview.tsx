/**
 * apps/web/src/components/marketing/ReportPreview.tsx
 * Two-column band: a sample batch report on the left, explanation on the right.
 * Status chips use marketing StatusBadge colours, not dashboard VerdictBadge.
 */
import { Info } from "lucide-react";
import { Section } from "./Section";
import { SectionHeading } from "./SectionHeading";
import { StatusBadge, type MarketingStatus } from "./StatusBadge";

const rows: {
  order: string;
  payment: string;
  status: MarketingStatus;
  reason: string;
}[] = [
  { order: "#001", payment: "KES 1,250", status: "release", reason: "Payment match" },
  { order: "#002", payment: "KES 1,250", status: "review", reason: "Unusual sender" },
  { order: "#003", payment: "KES 1,250", status: "hold", reason: "Possible duplicate" },
];

/**
 * Window-chrome report that mimics the live product without showing a Verified badge.
 *
 * @returns The sample report figure
 */
function ReportWindow() {
  return (
    <figure
      className="overflow-hidden rounded-[1.35rem] border border-[#F0E2C8] bg-brand-surface shadow-brand-lg"
      aria-label="Sample batch verification report"
    >
      <div className="flex items-center gap-3 border-b border-[#F3E6D4] bg-[#FFF8E4] px-4 py-3 sm:px-5">
        <span className="flex gap-1.5" aria-hidden>
          <span className="h-2.5 w-2.5 rounded-full bg-brand-raspberry/85" />
          <span className="h-2.5 w-2.5 rounded-full bg-brand-yellow" />
          <span className="h-2.5 w-2.5 rounded-full bg-brand-tangerine" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold tracking-tight text-brand-ink">Batch Verification Report</p>
          <p className="text-xs text-brand-muted">Sample · 3 orders</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-[#F3E6D4] px-4 py-3 sm:px-5">
        <span className="rounded-brand-pill bg-brand-release-bg px-2.5 py-1 text-xs font-semibold text-brand-release">
          1 release
        </span>
        <span className="rounded-brand-pill bg-brand-review-bg px-2.5 py-1 text-xs font-semibold text-brand-review">
          1 review
        </span>
        <span className="rounded-brand-pill bg-brand-hold-bg px-2.5 py-1 text-xs font-semibold text-brand-hold">
          1 hold
        </span>
      </div>

      <ul className="divide-y divide-[#F3E6D4] sm:hidden">
        {rows.map((row) => (
          <li key={row.order} className="px-4 py-3.5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold tabular-nums text-brand-ink">{row.order}</p>
                <p className="mt-0.5 text-sm tabular-nums text-brand-muted">{row.payment}</p>
              </div>
              <StatusBadge status={row.status} />
            </div>
            <p className="mt-2 text-sm text-brand-muted">{row.reason}</p>
          </li>
        ))}
      </ul>

      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Sample orders with payment, status, and reason</caption>
          <thead className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-brand-muted">
            <tr className="border-b border-[#F3E6D4]">
              <th scope="col" className="px-5 py-3">
                Order
              </th>
              <th scope="col" className="px-3 py-3">
                Payment
              </th>
              <th scope="col" className="px-3 py-3">
                Status
              </th>
              <th scope="col" className="px-5 py-3">
                Reason
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.order} className="border-b border-[#F3E6D4] last:border-b-0">
                <td className="px-5 py-3.5 font-semibold tabular-nums text-brand-ink">{row.order}</td>
                <td className="px-3 py-3.5 tabular-nums text-brand-ink">{row.payment}</td>
                <td className="px-3 py-3.5">
                  <StatusBadge status={row.status} />
                </td>
                <td className="px-5 py-3.5 text-brand-muted">{row.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}

/**
 * Landing-page demonstration of the batch report a seller receives.
 *
 * @returns The report preview section
 */
export function ReportPreview() {
  return (
    <Section width="wide" className="scroll-mt-24">
      <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16 xl:gap-20">
        <ReportWindow />
        <div>
          <SectionHeading
            eyebrow="Order Reports"
            title="Know exactly which orders to release, review or hold."
            description="Get a clear report showing which orders are verified, which need a closer look, and which to hold — so you can avoid scams and protect your stock and money."
          />
          <div className="mt-8 flex gap-3 rounded-brand-card border border-[#F3E6D4] bg-[#FFF4C2] px-4 py-4 sm:px-5">
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-brand-orange" aria-hidden />
            <p className="text-sm leading-relaxed text-brand-ink">
              A suspicious message alone may not always be conclusive. Stronger confirmation requires a statement or
              trusted payment source.
            </p>
          </div>
        </div>
      </div>
    </Section>
  );
}
