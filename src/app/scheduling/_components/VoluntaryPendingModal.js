"use client";

import { CheckCircle2 } from "lucide-react";
import Modal from "@components/UI/Modal";
import Button from "@components/UI/Button";
import styles from "./VoluntaryPendingModal.module.css";

/**
 * Shown after a voluntary-overage shift is successfully created, instead of
 * the normal redirect to /scheduling.  Gives the admin explicit confirmation
 * that the shift exists but is waiting for the caregiver to respond.
 *
 * What "pending" means:
 *   • The shift IS created and appears in the schedule.
 *   • The backend auto-created an overtime_acknowledgment approval and pushed
 *     a notification to the caregiver's mobile app.
 *   • The caregiver calls POST /api/approvals/:id/approve with
 *     { "bankHours": true|false } to elect bank-or-pay.
 *   • Clock-in is blocked (OVERTIME_ACK_REQUIRED) until they respond.
 *   • If they decline (or the 48h auto-decline fires), the admin receives a
 *     mandate-or-remove decision via the approvals system.
 *
 * Props:
 *   isOpen              — controls Modal visibility
 *   onClose             — called on backdrop click or "Go to Schedule"
 *   caregiverName       — display name of the caregiver
 *   plannedOverageHours — number of overage hours (null if unavailable)
 *   approvalId          — the auto-created approval's ID (null if unavailable)
 */
export default function VoluntaryPendingModal({
	isOpen,
	onClose,
	caregiverName,
	plannedOverageHours,
	approvalId,
}) {
	return (
		<Modal isOpen={isOpen} onClose={onClose}>
			<div className={styles.capPendingBody}>
				<CheckCircle2 size={40} className={styles.capPendingIcon} />
				<h2 className={styles.capPendingTitle}>Shift Created — Pending Acknowledgment</h2>

				<p className={styles.capPendingText}>
					A voluntary overtime shift was created for{" "}
					<strong>{caregiverName}</strong>.
					{plannedOverageHours != null && (
						<> The overage is <strong>{plannedOverageHours}h</strong>.</>
					)}
				</p>

				{/*
				 * The backend automatically created an overtime_acknowledgment
				 * approval and pushed a notification to the caregiver's mobile app.
				 * The caregiver calls POST /api/approvals/:id/approve with
				 * { "bankHours": true|false } to elect bank-or-pay.
				 * Until they do, clock-in is blocked (OVERTIME_ACK_REQUIRED).
				 */}
				<div className={styles.capPendingApprovalBox}>
					<p className={styles.capPendingApprovalLabel}>
						An acknowledgment request was sent to{" "}
						<strong>{caregiverName}</strong>&rsquo;s app.
						They must choose to bank or be paid for the extra hours before
						clocking in.
					</p>
					{approvalId && (
						<p className={styles.capPendingApprovalId}>
							Approval ID:{" "}
							<code>{approvalId}</code>
						</p>
					)}
				</div>

				<p className={styles.capPendingNote}>
					If they decline, you&rsquo;ll receive an approval in the portal to
					mandate overtime or remove them from the shift.
				</p>

				<Button variant="primary" onClick={onClose}>
					Go to Schedule
				</Button>
			</div>
		</Modal>
	);
}
