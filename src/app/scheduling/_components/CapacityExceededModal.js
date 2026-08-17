"use client";

import { AlertCircle } from "lucide-react";
import { DateTime } from "luxon";
import Modal from "@components/UI/Modal";
import Button from "@components/UI/Button";
import styles from "./CapacityExceededModal.module.css";

const HALIFAX_TZ = "America/Halifax";

/**
 * Shown automatically when the backend returns 409 CAPACITY_EXCEEDED.
 * Displays the full hours breakdown and collects the admin's decision
 * (mandate or voluntary) before resubmitting the blocked shift.
 *
 * Props:
 *   isOpen          — controls Modal visibility
 *   onClose         — called when the modal is dismissed (cancel or backdrop)
 *   caregiverName   — display name of the caregiver who exceeded capacity
 *   details         — CAPACITY_EXCEEDED details payload from the 409 response:
 *                     { maxHours, committedHours, shiftHours, projectedTotal,
 *                       overageHours, payPeriod }
 *   decision        — currently selected option: "mandated" | "voluntary" | null
 *   onDecisionChange — (value: string) => void — called when a decision button is clicked
 *   onConfirm       — called when "Confirm & Create Shift" is clicked
 *   isSaving        — disables the confirm button while the mutation is in-flight
 */
export default function CapacityExceededModal({
	isOpen,
	onClose,
	caregiverName,
	details = {},
	decision,
	onDecisionChange,
	onConfirm,
	isSaving,
}) {
	const pp = details.payPeriod;
	const ppLabel = pp
		? `PP${pp.periodNumber} · ${
			DateTime.fromISO(pp.periodStart).setZone(HALIFAX_TZ).toFormat("MMM d")
		} – ${
			DateTime.fromISO(pp.periodEnd).setZone(HALIFAX_TZ).toFormat("MMM d, yyyy")
		}`
		: "";

	return (
		<Modal isOpen={isOpen} onClose={onClose}>
			<div className={styles.capModalBody}>

				<div className={styles.capModalHeader}>
					<AlertCircle size={22} className={styles.capModalIcon} />
					<div>
						<h2 className={styles.capModalTitle}>Overtime Capacity Exceeded</h2>
						<p className={styles.capModalSubtitle}>
							<strong>{caregiverName}</strong> will exceed their bi-weekly capacity
							for this pay period. Choose how to handle the overage.
						</p>
					</div>
				</div>

				{/* Hours breakdown — mirrors the 409 CAPACITY_EXCEEDED details payload */}
				<div className={styles.capStatsGrid}>
					<div className={styles.capStat}>
						<span className={styles.capStatLabel}>Bi-weekly cap</span>
						<span className={styles.capStatValue}>{details.maxHours}h</span>
					</div>
					<div className={styles.capStat}>
						<span className={styles.capStatLabel}>Already committed</span>
						<span className={styles.capStatValue}>{details.committedHours}h</span>
					</div>
					<div className={styles.capStat}>
						<span className={styles.capStatLabel}>This shift</span>
						<span className={styles.capStatValue}>{details.shiftHours}h</span>
					</div>
					<div className={styles.capStat}>
						<span className={styles.capStatLabel}>Projected total</span>
						<span className={styles.capStatValue}>{details.projectedTotal}h</span>
					</div>
					<div className={`${styles.capStat} ${styles.capStatOverage}`}>
						<span className={styles.capStatLabel}>Over by</span>
						<span className={styles.capStatValue}>+{details.overageHours}h</span>
					</div>
				</div>

				{ppLabel && (
					<p className={styles.capPPLabel}>Pay period: {ppLabel}</p>
				)}

				{/*
				 * Decision buttons — mutually exclusive; click to select, then Confirm.
				 * "mandated"  → overtime pay, no caregiver action needed.
				 * "voluntary" → bank-or-pay acknowledgment pushed to caregiver's app.
				 */}
				<div className={styles.capDecisionRow}>
					<button
						className={`${styles.capDecisionBtn}${decision === "mandated" ? ` ${styles.capDecisionBtnActive}` : ""}`}
						onClick={() => onDecisionChange("mandated")}
					>
						<strong>Mandate overtime</strong>
						<span>Overtime pay · no caregiver action needed</span>
					</button>
					<button
						className={`${styles.capDecisionBtn}${decision === "voluntary" ? ` ${styles.capDecisionBtnActive}` : ""}`}
						onClick={() => onDecisionChange("voluntary")}
					>
						<strong>Voluntary</strong>
						<span>Caregiver acknowledges bank-or-pay via app</span>
					</button>
				</div>

				{/* Confirm disabled until a decision is chosen */}
				<div className={styles.capModalActions}>
					<Button
						variant="primary"
						onClick={onConfirm}
						disabled={!decision || isSaving}
					>
						{isSaving ? "Saving…" : "Confirm & Create Shift"}
					</Button>
					<Button variant="secondary" onClick={onClose}>
						Cancel
					</Button>
				</div>

			</div>
		</Modal>
	);
}
