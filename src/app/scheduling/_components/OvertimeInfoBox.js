"use client";

import styles from "./OvertimeInfoBox.module.css";

/**
 * Shared explanation block for the overtime-decision modals (single-shift
 * CapacityExceededModal and the shift_builder bulk-grid version). Both
 * modals present the exact same "mandate vs. voluntary" choice once a
 * caregiver's hours for the pay period go over their bi-weekly capacity, so
 * the copy lives here once instead of being duplicated in each modal.
 *
 * `maxHours` is that caregiver's actual cap (biWeeklyWorkCapacity.maxHours,
 * 84 by default but admin-editable per caregiver) — not a fixed number, so
 * it's passed in rather than hardcoded. Omit it (e.g. the shift_builder bulk
 * modal, which can cover several caregivers with different caps at once) to
 * fall back to generic wording instead of a specific, possibly wrong, figure.
 */
export default function OvertimeInfoBox({ maxHours }) {
	return (
		<div className={styles.overtimeInfoBox}>
			<p className={styles.overtimeInfoBoxTitle}>How this works</p>
			<p className={styles.overtimeInfoBoxText}>
				Once a caregiver&apos;s hours for the pay period go over{" "}
				{maxHours != null ? `${maxHours}h` : "their bi-weekly capacity"}, you
				must choose how to handle the extra time:
			</p>
			<p className={styles.overtimeInfoBoxText}>
				<strong>Mandate overtime</strong> flags the overage as overtime
				hours — payroll processes it at the overtime rate. The caregiver isn&apos;t notified and stays
				on the shift.
			</p>
			<p className={styles.overtimeInfoBoxText}>
				<strong>Voluntary</strong> sends an acknowledgment request to the
				caregiver&apos;s app. If they accept, the extra hours are paid at
				their regular rate (or banked, based on their choice). If they
				decline, it comes back to you to either mandate the overtime
				yourself or remove them and assign a new caregiver.
			</p>
		</div>
	);
}
