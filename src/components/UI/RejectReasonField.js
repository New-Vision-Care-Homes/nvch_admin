"use client";

import styles from "./RejectReasonField.module.css";

/**
 * Required-reason textarea used by reject/remove flows (certificate rejection,
 * approval rejection, mandate removal). Owns only the field's markup — the
 * parent still owns the value, the clear-on-type logic, and validation.
 *
 * @param {string}   label       - Field label, e.g. "Reason for rejection"
 * @param {string}   placeholder
 * @param {string}   value
 * @param {Function} onChange    - Called with the new string value
 * @param {string}   [error]     - Validation message shown below the textarea
 */
export default function RejectReasonField({ label = "Reason for rejection", placeholder, value, onChange, error }) {
	return (
		<div className={styles.field}>
			<label className={styles.label}>
				{label} <span className={styles.required}>*</span>
			</label>
			<textarea
				className={`${styles.textarea} ${error ? styles.textareaError : ""}`}
				rows={3}
				placeholder={placeholder}
				value={value}
				onChange={(e) => onChange(e.target.value)}
			/>
			{error && <span className={styles.errorMsg}>{error}</span>}
		</div>
	);
}
