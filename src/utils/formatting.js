/**
 * Shared display-formatting helpers.
 */

/**
 * USE THIS when you have a person object from an API response and need to
 * display their name in the UI (tables, badges, dropdowns, alt text, etc.).
 *
 * Takes a person object and returns "First Last", falling back to the provided
 * `fallback` string (default "—") when both names are absent, so you never
 * render "undefined undefined" or an empty cell.
 *
 * Do NOT use this to build an API payload — use joinName() for that instead.
 *
 * @param {{ firstName?: string, lastName?: string }} person
 * @param {string} [fallback="—"]
 * @returns {string}
 *
 * @example
 * fullName(admin)               // → "Jane Doe"
 * fullName(null)                // → "—"
 * fullName(caregiver, "Unknown") // → "Unknown" when both names are blank
 */
export function fullName(person, fallback = "—") {
	const name = [person?.firstName, person?.lastName]
		.filter(Boolean)
		.join(" ")
		.trim();
	return name || fallback;
}

/**
 * Resolves a person object to a display name, falling back to email then "—".
 * Handles API objects that may have firstName/lastName and/or email.
 *
 * @param {{ firstName?: string, lastName?: string, email?: string } | null} obj
 * @returns {string}
 */
export function personName(obj) {
	if (!obj) return "—";
	const full = `${obj.firstName || ""} ${obj.lastName || ""}`.trim();
	return full || obj.email || "—";
}

/**
 * USE THIS when you are building an API payload and need to combine separate
 * first/last name form fields into a single `name` string (e.g. emergency
 * contacts, next of kin, power of attorney).
 *
 * Returns null when both parts are blank, which tells the backend "not
 * provided". Never use this for display — null would render as "null" in JSX.
 * Use fullName() for display instead.
 *
 * @param {string} [first]
 * @param {string} [last]
 * @returns {string | null}
 *
 * @example
 * joinName(data.emergencyFName, data.emergencyLName) // → "Jane Doe" or null
 * joinName("", "")                                   // → null  (not "")
 */
export function joinName(first, last) {
	return `${first || ""} ${last || ""}`.trim() || null;
}

/**
 * Splits a full name string into first and last parts.
 * Multi-word last names are preserved (everything after the first word).
 *
 * @param {string} [full]
 * @returns {{ first: string, last: string }}
 */
export function splitName(full) {
	const parts = full?.split(" ") || [];
	return { first: parts[0] || "", last: parts.slice(1).join(" ") || "" };
}

/**
 * Looks up a human-readable label from an options array (value/label pairs).
 * Falls back to the raw value, then "—" if nothing matches.
 *
 * @param {{ value: string, label: string }[]} options
 * @param {string} value
 * @returns {string}
 */
export function getLabel(options, value) {
	return options.find(o => o.value === value)?.label || value || "—";
}

/**
 * Formats an address object into a single comma-separated display string.
 * Accepts an address object or a plain string (returned as-is).
 * Returns null when no address parts are present.
 *
 * @param {string | { unit?: string, street?: string, city?: string, state?: string, province?: string, pinCode?: string, postalCode?: string, country?: string } | null} addr
 * @returns {string | null}
 */
export function formatAddress(addr) {
	if (!addr) return null;
	if (typeof addr === "string") return addr;
	return [
		addr.unit,
		addr.street,
		addr.city,
		addr.state || addr.province,
		addr.pinCode || addr.postalCode,
		addr.country,
	].filter(Boolean).join(", ") || null;
}

/**
 * Formats a string of digits into a North American phone number:
 *   "(XXX) XXX-XXXX". Non-digits are stripped and input is capped at 10 digits.
 * Returns a partial format while the user is still typing.
 *
 * @param {string} value
 * @returns {string}
 */
export function formatPhoneNumber(value) {
	const digits = String(value ?? "").replace(/\D/g, "").substring(0, 10);
	if (digits.length > 6) {
		return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
	}
	if (digits.length > 3) {
		return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
	}
	if (digits.length > 0) {
		return `(${digits}`;
	}
	return "";
}
