/**
 * The fate of one outbound message.
 *
 * Rendered for agent messages only. An agent looking at a thread needs to know
 * whether the person outside actually received this — an inbox that cannot
 * answer that question is one people stop trusting.
 */
export function DeliveryBadge({
  delivery,
  deliveredAt,
  error,
}: {
  delivery: string;
  deliveredAt: Date | null;
  error: string | null;
}) {
  if (delivery === "sent") {
    return (
      <span title={deliveredAt ? new Date(deliveredAt).toLocaleString() : undefined}>
        · delivered
      </span>
    );
  }
  if (delivery === "pending") return <span>· sending…</span>;
  if (delivery === "failed") {
    return <span title={error ?? undefined}>· not delivered</span>;
  }
  // not_applicable — an internal note, or a thread with no address.
  if (error) return <span title={error}>· not sent</span>;
  return null;
}
