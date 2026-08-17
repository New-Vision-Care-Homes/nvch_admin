/**
 * Date formatting and conversion utilities.
 *
 * All functions accept ISO 8601 strings (or null/undefined) and return a
 * safe fallback ("—" or "") instead of throwing on bad input.
 *
 * PROJECT TIMEZONE RULE
 * ----------------------
 * All wall-clock times displayed to users must be shown in Atlantic Time
 * (IANA: "America/Halifax"), which covers both AST (UTC−4) and ADT (UTC−3).
 * Pass this constant to every toLocaleString / toLocaleDateString call that
 * renders a timestamp.
 *
 * EXCEPTION — calendar dates (formatDateOnly)
 * --------------------------------------------
 * Certificate issue/expiry/renewal dates represent calendar dates, not
 * moments in time. They are stored as midnight UTC
 * (e.g. "2024-01-01T00:00:00.000Z"). Converting midnight UTC to Atlantic
 * Time (UTC−4) produces "Dec 31, 2023 20:00", so toLocaleDateString would
 * render "Dec 31" — one day off. For these fields we pin to UTC instead,
 * which preserves the intended calendar date regardless of the viewer's
 * actual location.
 */

/** IANA timezone identifier for the project's display timezone. */
const DISPLAY_TZ = "America/Halifax";

/**
 * Formats an ISO 8601 datetime string for display with both date and time,
 * converted to Atlantic Time (AST/ADT).
 *
 * Use this wherever an event timestamp needs to be shown: createdAt,
 * updatedAt, decidedAt, shift times, etc.
 *
 * @param {string|null|undefined} iso
 *   ISO 8601 string, e.g. "2024-01-15T17:00:00.000Z"
 * @param {string} [fallback="—"]
 *   Returned when `iso` is falsy or cannot be parsed.
 * @returns {string}
 *   Human-readable date + time in Atlantic Time,
 *   e.g. "Jan 15, 2024, 01:00 p.m." (UTC−4 → 1 pm AT)
 *
 * @example
 * formatDateTime("2024-01-15T17:00:00.000Z") // "Jan 15, 2024, 01:00 p.m."
 * formatDateTime(null)                         // "—"
 */
export function formatDateTime(iso, fallback = "—") {
	if (!iso) return fallback;
	try {
		return new Date(iso).toLocaleString("en-CA", {
			year: "numeric", month: "short", day: "numeric",
			hour: "2-digit", minute: "2-digit",
			timeZone: DISPLAY_TZ,
		});
	} catch {
		return fallback;
	}
}

/**
 * Formats an ISO 8601 date or datetime string as a date-only label.
 *
 * Pinned to UTC (NOT Atlantic Time) intentionally — see module comment above.
 * Certificate dates are stored as midnight UTC; converting to Atlantic Time
 * would shift them one day back for all AT users.
 *
 * Use this for certificate issue/expiry/renewal dates and any other field
 * that represents a calendar date rather than a wall-clock moment.
 *
 * @param {string|null|undefined} iso
 *   ISO 8601 string, e.g. "2024-01-01" or "2024-01-01T00:00:00.000Z"
 * @param {string} [fallback="—"]
 *   Returned when `iso` is falsy or cannot be parsed.
 * @returns {string}
 *   Human-readable date, e.g. "Jan 1, 2024"
 *
 * @example
 * formatDateOnly("2024-01-01T00:00:00.000Z") // "Jan 1, 2024"
 * formatDateOnly("2026-06-15")                // "Jun 15, 2026"
 * formatDateOnly(null)                         // "—"
 */
export function formatDateOnly(iso, fallback = "—") {
	if (!iso) return fallback;
	try {
		return new Date(iso).toLocaleDateString("en-CA", {
			year: "numeric", month: "short", day: "numeric", timeZone: "UTC",
		});
	} catch {
		return fallback;
	}
}

/**
 * Converts an ISO 8601 date string to the "YYYY-MM-DD" format required
 * by HTML `<input type="date">` elements.
 *
 * Works by slicing the first 10 characters, so it handles both date-only
 * ("2024-01-01") and full datetime ("2024-01-01T00:00:00.000Z") inputs
 * without any timezone conversion — the calendar date in the string is
 * preserved exactly as stored.
 *
 * Safe to call on null/undefined — returns "" so the input stays blank
 * rather than showing an invalid value.
 *
 * @param {string|null|undefined} iso
 *   ISO 8601 string, e.g. "2024-01-01T00:00:00.000Z" or "2024-01-01"
 * @returns {string}
 *   "YYYY-MM-DD" for use as an input's `value`, or "" when falsy.
 *
 * @example
 * toDateInput("2024-01-01T00:00:00.000Z") // "2024-01-01"
 * toDateInput("2026-06-15")                // "2026-06-15"
 * toDateInput(null)                         // ""
 * toDateInput(undefined)                    // ""
 */
export function toDateInput(iso) {
	if (!iso) return "";
	return String(iso).slice(0, 10);
}
