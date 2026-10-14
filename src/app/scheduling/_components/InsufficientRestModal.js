"use client";

import { AlertCircle } from "lucide-react";
import { localShiftLabel } from "@/utils/timeHandling";
import Modal from "@components/UI/Modal/Modal";
import Button from "@components/UI/Button/Button";
import styles from "./InsufficientRestModal.module.css";

const HALIFAX_TZ = "America/Halifax";

// "in_progress" → "in progress"; CSS capitalizes it
const statusLabel = (status) => status?.replace(/_/g, " ");

/**
 * Groups conflicts by their `group` label (caregiver name; "" when absent,
 * which yields a single unnamed group), groups A→Z and
 * each group's shifts earliest first by `sortKey` (an ISO-like local date-time
 * string, so plain string order is time order).
 * Returns [{ name, items }].
 */
function groupConflicts(conflicts) {
	const byName = new Map();
	for (const c of conflicts) {
		const name = c.group ?? "";
		if (!byName.has(name)) byName.set(name, []);
		byName.get(name).push(c);
	}
	return [...byName.entries()]
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([name, items]) => ({
			name,
			items: [...items].sort((a, b) => String(a.sortKey ?? "").localeCompare(String(b.sortKey ?? ""))),
		}));
}

/**
 * Shown when the backend rejects a shift with 400 INSUFFICIENT_REST_BETWEEN_SHIFTS:
 * the worker would have less than 8 hours between this shift and another of
 * their scheduled, in-progress or completed shifts.
 *
 * Used by the single-shift pages (Add Shift, Edit Shift) with one conflict,
 * shown as a single card, and by the Schedule Builder with one conflict per
 * failed grid cell, shown as one card per caregiver so a long list stays
 * readable. Rows look the same in both.
 *
 * Props:
 *   isOpen    — controls Modal visibility
 *   onClose   — called on backdrop click, the X button or "OK"
 *   message   — the API's `error` text, shown as-is
 *   conflicts — one entry per blocked shift:
 *                 key     — React list key
 *                 group   — optional caregiver name; entries are grouped by it
 *                           under a name header (Schedule Builder). The
 *                           single-shift pages omit it — one card, no header
 *                 title   — label for the blocked shift itself
 *                 sortKey — orders shifts inside a group, earliest first
 *                           (local "yyyy-MM-ddTHH:mm" string)
 *                 details — the API's `details` payload:
 *                           { minimumRestHours, restHours,
 *                             conflictingShift: { startTime, endTime, status } }
 *                           The conflicting shift can sit before OR after the
 *                           blocked one; restHours is 0 for back-to-back shifts.
 */
export default function InsufficientRestModal({ isOpen, onClose, message, conflicts = [] }) {

	return (
		<Modal isOpen={isOpen} onClose={onClose}>
			<div className={styles.restModalBody}>

				<div className={styles.restModalHeader}>
					<AlertCircle size={22} className={styles.restModalIcon} />
					<div>
						<h2 className={styles.restModalTitle}>Not Enough Rest Between Shifts</h2>

						{/* Popup message from the API */}
						<p className={styles.restModalSubtitle}>{message}</p>
					</div>
				</div>

				{/*
				 * One card per caregiver (Schedule Builder, A→Z) or a single card
				 * without the name header (Add / Edit Shift). Each row is a blocked
				 * shift, earliest first, with the shift it sits too close to and the
				 * rest it would leave.
				 */}
				{conflicts.length > 0 && (
					<div className={styles.restGroupList}>
						{groupConflicts(conflicts).map(({ name, items }) => (
							<section key={name || "rest"} className={styles.restGroup}>
								{name && (
									<div className={styles.restGroupHeader}>
										<span className={styles.restGroupName}>{name}</span>
										<span className={styles.restGroupCount}>
											{items.length} shift{items.length !== 1 ? "s" : ""}
										</span>
									</div>
								)}
								<ul className={styles.restGroupRows}>
									{items.map(({ key, title, details }) => {
										const other = details?.conflictingShift;
										const when  = other ? localShiftLabel(other.startTime, other.endTime, HALIFAX_TZ) : null;
										return (
											<li key={key} className={styles.restGroupRow}>
												<div className={styles.restGroupRowMain}>
													{title && <span className={styles.restGroupRowTitle}>{title}</span>}
													{when && (
														<span className={styles.restGroupRowConflict}>
															Conflicts with: {when}
															{other.status && (
																<span className={styles.restConflictStatus}> · {statusLabel(other.status)}</span>
															)}
														</span>
													)}
												</div>
												{details?.restHours != null && (
													<span className={styles.restRestChip}>{details.restHours}h rest</span>
												)}
											</li>
										);
									})}
								</ul>
							</section>
						))}
					</div>
				)}

				<p className={styles.restModalNote}>Choose another caregiver or time.</p>

				<Button variant="primary" onClick={onClose}>OK</Button>
			</div>
		</Modal>
	);
}
