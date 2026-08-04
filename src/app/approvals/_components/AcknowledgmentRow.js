"use client";

import { Clock, CreditCard, Download, Loader2 } from "lucide-react";
import Button from "@components/UI/Button";
import { formatDateTime } from "@/utils/dates";
import { timeAgo, ACK_STATUS_META } from "../_utils/approvalMeta";
import styles from "../approvals.module.css";

export default function AcknowledgmentRow({ ack, onExport, isExportingThis }) {
	const caregiver = ack.caregiver ?? {};
	const shift     = ack.shift     ?? {};
	const meta      = ACK_STATUS_META[ack.status] ?? ACK_STATUS_META.pending;

	const caregiverName = [caregiver.firstName, caregiver.lastName]
		.filter(Boolean).join(" ") || "Unknown";

	return (
		<div className={styles.ackRow}>
			<div className={styles.ackRowLeft}>
				<div className={styles.ackRowHeader}>
					<span className={styles.ackCaregiverName}>{caregiverName}</span>
					{caregiver.employeeId && (
						<span className={styles.ackEmployeeId}>{caregiver.employeeId}</span>
					)}
				</div>

				<div className={styles.ackRowDetail}>
					{shift.startTime && (
						<span className={styles.ackShiftTime}>
							<Clock size={11} />
							{formatDateTime(shift.startTime)}
							{shift.endTime && ` – ${formatDateTime(shift.endTime)}`}
						</span>
					)}
					{ack.plannedOverageHours != null && (
						<span className={styles.ackOverageTag}>
							{ack.plannedOverageHours}h overage
						</span>
					)}
					{shift.designation && (
						<span className={`${styles.ackDesignationTag} ${shift.designation === "voluntary" ? styles.ackDesignationVoluntary : styles.ackDesignationMandated}`}>
							{shift.designation}
						</span>
					)}
				</div>

				{ack.status === "acknowledged" && ack.bankRequested != null && (
					<div className={styles.ackBankRow}>
						<CreditCard size={11} />
						{ack.bankRequested ? "Bank hours" : "Pay out"}
					</div>
				)}

				{ack.reason && (
					<div className={styles.ackReason}>&ldquo;{ack.reason}&rdquo;</div>
				)}
			</div>

			<div className={styles.ackRowRight}>
				<span className={`${styles.ackBadge} ${styles[meta.badgeKey]}`}>
					{meta.label}
				</span>
				<span className={styles.ackTimestamp}>
					{timeAgo(ack.requestedAt)}
				</span>
				{ack.decidedAt && (
					<span className={styles.ackDecidedAt}>
						Decided {formatDateTime(ack.decidedAt)}
					</span>
				)}
				{ack.status === "acknowledged" && onExport && (
					<Button
						variant="excel"
						size="sm"
						icon={isExportingThis
							? <Loader2 size={12} className={styles.ackExportSpinner} />
							: <Download size={12} />
						}
						onClick={(e) => { e.stopPropagation(); onExport(); }}
						disabled={isExportingThis}
					>
						{isExportingThis ? "…" : "Export"}
					</Button>
				)}
			</div>
		</div>
	);
}
