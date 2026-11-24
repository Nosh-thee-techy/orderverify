/**
 * apps/web/src/app/batches/[id]/layout.tsx
 * Ownership gate for the report and activity pages. Another seller's id is a 404.
 */
import { notFound } from "next/navigation";
import { loadOwnedBatch } from "@/server/ownership";
import { getCurrentSeller } from "@/server/seller";

/**
 * Confirm the batch belongs to the signed-in seller before rendering children.
 */
export default async function BatchLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const seller = await getCurrentSeller();
  const { id } = await params;
  const batch = await loadOwnedBatch(seller.id, id);
  if (!batch) notFound();
  return children;
}
