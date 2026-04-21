/**
 * timeUtils.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Shared time-formatting utilities for the NVCH Admin app.
 *
 * All shifts are stored as UTC ISO strings in the backend but displayed in
 * Halifax local time (America/Halifax — Atlantic Standard / Daylight Time).
 *
 * Usage:
 *   import { formatHalifaxTime, toHalifaxInputValue } from "@/utils/timeUtils";
 */

export const HALIFAX_TZ = "America/Halifax";

/**
 * Format a UTC date string into a human-readable Halifax local time string.
 *
 * @param {string|Date} dateStr  - UTC date string or Date object
 * @param {Object}      opts     - Optional Intl.DateTimeFormat overrides
 * @returns {string}             - e.g. "April 21, 2026 at 2:30 p.m."
 *
 * @example
 *   formatHalifaxTime(shift.startTime)
 *   // → "April 21, 2026 at 2:30 p.m."
 *
 *   formatHalifaxTime(shift.startTime, { dateStyle: "short", timeStyle: "short" })
 *   // → "2026-04-21, 2:30 p.m."
 */
export function formatHalifaxTime(dateStr, opts = {}) {
	if (!dateStr) return "N/A";
	try {
		const date = new Date(dateStr);
		if (isNaN(date.getTime())) return "Invalid Date";
		return new Intl.DateTimeFormat("en-CA", {
			timeZone: HALIFAX_TZ,
			year: "numeric",
			month: "long",
			day: "numeric",
			hour: "numeric",
			minute: "2-digit",
			hour12: true,
			...opts,
		}).format(date);
	} catch {
		return "Invalid Date";
	}
}

/**
 * Convert a UTC ISO date string to a Halifax-local value suitable for
 * an HTML <input type="datetime-local"> (format: YYYY-MM-DDTHH:MM).
 *
 * This is needed because datetime-local inputs work in local browser time,
 * but our backend stores UTC. By pre-converting to Halifax time we ensure
 * the displayed value in the input matches what the admin expects.
 *
 * @param {string|Date} dateStr  - UTC date string or Date object
 * @returns {string}             - e.g. "2026-04-21T14:30"
 *
 * @example
 *   toHalifaxInputValue(shift.startTime)  // → "2026-04-21T14:30"
 */
export function toHalifaxInputValue(dateStr) {
	if (!dateStr) return "";
	try {
		const date = new Date(dateStr);
		if (isNaN(date.getTime())) return "";

		const parts = new Intl.DateTimeFormat("en-CA", {
			timeZone: HALIFAX_TZ,
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
			hour: "2-digit",
			minute: "2-digit",
			hour12: false,
		}).formatToParts(date);

		const p = {};
		parts.forEach(({ type, value }) => { p[type] = value; });

		// Midnight in 24-hour format can be "24:00" in some implementations
		const hour = p.hour === "24" ? "00" : p.hour;
		return `${p.year}-${p.month}-${p.day}T${hour}:${p.minute}`;
	} catch {
		return "";
	}
}

/**
 * Convert a Halifax-local datetime-local input value back to a UTC ISO string
 * for sending to the backend.
 *
 * Because datetime-local inputs don't carry timezone info, we treat the
 * inputted value as Halifax local time and convert to UTC.
 *
 * @param {string} inputValue  - Value from a datetime-local input ("YYYY-MM-DDTHH:MM")
 * @returns {string}           - UTC ISO string, e.g. "2026-04-21T17:30:00.000Z"
 *
 * @example
 *   halifaxInputToUTC("2026-04-21T14:30")  // → "2026-04-21T17:30:00.000Z"  (ADT = UTC-3)
 */
export function halifaxInputToUTC(inputValue) {
	if (!inputValue) return undefined;
	try {
		// The Intl API can tell us the Halifax offset at a given moment via
		// formatting an Epoch time and comparing. A simpler approach that's
		// accurate for near-future dates: parse as if it were UTC, then
		// adjust by the current Halifax offset.
		//
		// We use a trick: format a known UTC time in Halifax TZ to find the
		// current offset, then apply it.
		const tempDate = new Date(inputValue + "Z"); // parse as UTC first
		const halifaxStr = tempDate.toLocaleString("en-CA", { timeZone: HALIFAX_TZ, hour12: false });
		const utcStr = tempDate.toLocaleString("en-CA", { timeZone: "UTC", hour12: false });

		// Parse both to compute offset
		const halifaxMs = new Date(halifaxStr.replace(",", "")).getTime();
		const utcMs = new Date(utcStr.replace(",", "")).getTime();
		const offsetMs = utcMs - halifaxMs; // positive when UTC is ahead of Halifax

		// Actual UTC = input (treated as Halifax) + offset
		const actualDate = new Date(new Date(inputValue).getTime() + offsetMs);
		return actualDate.toISOString();
	} catch {
		// Fallback: just parse and return as-is
		return new Date(inputValue).toISOString();
	}
}
