// Pay-period helpers — numbering arithmetic and labels ONLY.
//
// Pay periods are a continuous 14-day rotation with exactly 26 periods
// (PP1..PP26) per pay year; PP1 of a pay year may start in the prior
// calendar year (e.g. PP1/2026 = Dec 18 → Dec 31 2025). All period DATES
// come from the backend (GET /api/hours/pay-periods via hourService /
// usePayPeriod) — the frontend deliberately implements no date logic of
// its own, so the server stays the single source of truth.
export const PERIODS_PER_YEAR = 26;

// Step a { payYear, periodNumber } reference by `offset` periods along the
// rotation (offset may be negative; year boundaries roll over correctly).
export function shiftPayPeriodRef(payYear, periodNumber, offset) {
	const idx = periodNumber - 1 + offset;
	const yearShift = Math.floor(idx / PERIODS_PER_YEAR);
	return {
		payYear: payYear + yearShift,
		periodNumber: idx - yearShift * PERIODS_PER_YEAR + 1,
	};
}

// Convenience label, e.g. "PP13 (2026)".
export function formatPayPeriodLabel(period) {
	if (!period?.periodNumber) return "";
	return `PP${period.periodNumber} (${period.payYear})`;
}
