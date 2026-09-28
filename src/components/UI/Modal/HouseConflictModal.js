"use client";

import { TriangleAlert, ArrowRightLeft } from "lucide-react";
import styles from "./HouseConflictModal.module.css";

/**
 * Confirms taking a client OR caregiver from another home — the rule, payload,
 * and confirmMove override are identical for both entity types, only the copy
 * differs. Pass subjectLabel="Caregiver" to reuse this for caregiver moves.
 */
export default function HouseConflictModal({
	isOpen,
	onClose,
	onConfirm,
	subjectName,
	currentHomeName,
	newHomeName,
	subjectLabel = "Client",
}) {
	if (!isOpen) return null;

	return (
		<>
			<div className={styles.overlay} onClick={onClose} />
			<div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="conflict-title">
				<div className={styles.iconWrap}>
					<TriangleAlert className={styles.icon} />
				</div>

				<h2 id="conflict-title" className={styles.title}>{subjectLabel} Already Assigned</h2>

				<p className={styles.body}>
					<strong>{subjectName}</strong> is currently assigned to{" "}
					<span className={styles.homeBadge}>{currentHomeName || "another home"}</span>.
				</p>

				{newHomeName && (
					<div className={styles.movePreview}>
						<span className={styles.moveFrom}>{currentHomeName || "Current home"}</span>
						<ArrowRightLeft size={16} className={styles.moveArrow} />
						<span className={styles.moveTo}>{newHomeName}</span>
					</div>
				)}

				<p className={styles.hint}>
					Moving will remove this {subjectLabel.toLowerCase()} from their current home and reassign them here.
				</p>

				<div className={styles.actions}>
					<button className={styles.cancelBtn} onClick={onClose} type="button">
						Cancel
					</button>
					<button className={styles.confirmBtn} onClick={onConfirm} type="button">
						Move to {newHomeName || "this home"}
					</button>
				</div>
			</div>
		</>
	);
}
