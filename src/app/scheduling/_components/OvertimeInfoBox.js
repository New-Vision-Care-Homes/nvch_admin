"use client";

import styles from "./OvertimeInfoBox.module.css";

/**
 * Shared explanation block for the overtime-decision modals (single-shift
 * CapacityExceededModal and the shift_builder bulk-grid version). Both
 * modals present the exact same "mandate vs. voluntary" choice once a
 * caregiver's hours for the pay period go over 84h, so the copy lives here
 * once instead of being duplicated in each modal.
 */
export default function OvertimeInfoBox() {
	return (
		<div className={styles.overtimeInfoBox}>
			<p className={styles.overtimeInfoBoxTitle}>How this works</p>
			<p className={styles.overtimeInfoBoxText}>
				Once a caregiver&apos;s hours for the pay period go over 84h, you
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
