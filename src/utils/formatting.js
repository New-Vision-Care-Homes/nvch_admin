/**
 * Shared display-formatting helpers.
 */

/**
 * Joins a person's first and last name, tolerating missing fields.
 * Returns the provided `fallback` (default "—") when neither name is present,
 * so malformed API rows never render "undefined undefined".
 *
 * @param {{ firstName?: string, lastName?: string }} person
 * @param {string} [fallback]
 * @returns {string}
 */
export function fullName(person, fallback = "—") {
	const name = [person?.firstName, person?.lastName]
		.filter(Boolean)
		.join(" ")
		.trim();
	return name || fallback;
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
