// ─── Date / display helpers ───────────────────────────────────────────────────

export function timeAgo(dateStr) {
	const diff = Date.now() - new Date(dateStr).getTime();
	const m = Math.floor(diff / 60_000);
	const h = Math.floor(diff / 3_600_000);
	const d = Math.floor(diff / 86_400_000);
	if (m < 1)   return "Just now";
	if (m < 60)  return `${m}m ago`;
	if (h < 24)  return `${h}h ago`;
	if (d === 1) return "Yesterday";
	if (d < 7)   return `${d}d ago`;
	return new Date(dateStr).toLocaleDateString("en-CA", { month: "short", day: "numeric" });
}

export function formatCertName(raw) {
	if (!raw) return "—";
	return raw.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Filter options ────────────────────────────────────────────────────────────

export const CURRENT_YEAR   = new Date().getFullYear();
export const YEAR_OPTIONS   = [CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1];
export const PERIOD_OPTIONS = Array.from({ length: 26 }, (_, i) => i + 1);

// ─── Acknowledgment status display ────────────────────────────────────────────
// badgeKey resolves against styles[key] in the consuming component so this
// file stays free of CSS module imports.

export const ACK_STATUS_META = {
	pending:      { label: "Pending",      badgeKey: "ackBadgePending"      },
	acknowledged: { label: "Acknowledged", badgeKey: "ackBadgeAcknowledged" },
	declined:     { label: "Declined",     badgeKey: "ackBadgeDeclined"     },
	cancelled:    { label: "Cancelled",    badgeKey: "ackBadgeCancelled"    },
};
