"use client";

import { useMemo } from "react";
import { format } from "date-fns";
import { User } from "lucide-react";
import ErrorState from "@components/UI/ErrorState";
import { utcToZonedDateObject } from "@/utils/timeHandling";
import styles from "../scheduling.module.css";

const HALIFAX_TZ = "America/Halifax";

// Badge styles for each possible shift status value.
const STATUS_CFG = {
	completed:   { label: "Completed",   bg: "#d1fae5", color: "#065f46" },
	scheduled:   { label: "Scheduled",   bg: "#dbeafe", color: "#1e40af" },
	in_progress: { label: "In Progress", bg: "#fef3c7", color: "#92400e" },
	cancelled:   { label: "Cancelled",   bg: "#fee2e2", color: "#991b1b" },
	missed:      { label: "Missed",      bg: "#f3f4f6", color: "#374151" },
};

/**
 * Renders a paginated table of shifts for the selected 14-day pay period.
 * Stats (total shifts, scheduled hours, worked hours, unique caregivers) are
 * derived client-side from the fetched shift array.
 */
export default function PayrollView({
	payrollShifts,
	payrollPeriod,
	payPeriodError,
	payrollError,
	isPayrollLoading,
	refetchPayroll,
	payrollPage,
	setPayrollPage,
	router,
}) {
	const PAGE_SIZE = 10;

	// Sort shifts chronologically (server returns them in an unspecified order).
	const sorted = useMemo(() => {
		if (!payrollShifts?.length) return [];
		return [...payrollShifts].sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
	}, [payrollShifts]);

	const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
	const paginated  = sorted.slice((payrollPage - 1) * PAGE_SIZE, payrollPage * PAGE_SIZE);

	// Aggregate summary stats for the stat cards at the top.
	const stats = useMemo(() => {
		const scheduledHrs = sorted.reduce(
			(sum, s) => sum + (new Date(s.endTime) - new Date(s.startTime)) / 3_600_000, 0
		);
		const workedHrs = sorted.reduce((sum, s) => sum + (s.hoursWorked || 0), 0);
		const cgIds = new Set(sorted.map((s) => s.caregiver?._id || s.caregiver?.id).filter(Boolean));
		return {
			total:      sorted.length,
			scheduled:  scheduledHrs.toFixed(1),
			worked:     workedHrs.toFixed(1),
			caregivers: cgIds.size,
		};
	}, [sorted]);

	if (isPayrollLoading || (!payrollPeriod && !payPeriodError)) return <ErrorState isLoading />;
	if (payPeriodError)   return <ErrorState errorMessage={payPeriodError} />;
	if (payrollError)     return <ErrorState errorMessage={payrollError} onRetry={refetchPayroll} />;

	return (
		<div className={styles.payrollView}>
			{/* Summary stat cards */}
			<div className={styles.payrollStats}>
				{[
					{ value: stats.total,            label: "Shifts"    },
					{ value: `${stats.scheduled} h`, label: "Scheduled" },
					{ value: `${stats.worked} h`,    label: "Worked"    },
					{ value: stats.caregivers,       label: "Caregivers"},
				].map(({ value, label }) => (
					<div key={label} className={styles.payrollStatCard}>
						<span className={styles.payrollStatValue}>{value}</span>
						<span className={styles.payrollStatLabel}>{label}</span>
					</div>
				))}
			</div>

			{/* Shifts table */}
			{sorted.length === 0 ? (
				<div className={styles.payrollEmpty}>No shifts scheduled for this pay period.</div>
			) : (
				<>
					<div className={styles.payrollTableWrap}>
						<table className={styles.payrollTable}>
							<thead>
								<tr>
									<th>Date</th>
									<th>Time</th>
									<th>Caregiver</th>
									<th>Location</th>
									<th>Hours</th>
									<th>Status</th>
								</tr>
							</thead>
							<tbody>
								{paginated.map((shift) => {
									const sid   = shift._id || shift.id;
									const start = utcToZonedDateObject(shift.startTime, HALIFAX_TZ);
									const end   = utcToZonedDateObject(shift.endTime,   HALIFAX_TZ);
									const dur   = ((new Date(shift.endTime) - new Date(shift.startTime)) / 3_600_000).toFixed(1);
									const sc    = STATUS_CFG[shift.status] ?? STATUS_CFG.scheduled;
									const name  = [shift.caregiver?.firstName, shift.caregiver?.lastName]
										.filter(Boolean).join(" ") || "Unassigned";

									return (
										<tr
											key={sid}
											className={styles.payrollRow}
											onClick={() => router.push(`/scheduling/${sid}`)}
										>
											<td>{format(start, "EEE, MMM d")}</td>
											<td className={styles.payrollTimeCell}>{format(start, "HH:mm")} – {format(end, "HH:mm")}</td>
											<td className={styles.payrollNameCell}>
												<User size={13} style={{ marginRight: 5, flexShrink: 0, opacity: 0.6 }} />
												{name}
											</td>
											<td className={styles.payrollAddrCell}>{shift.clientAddress || "—"}</td>
											<td className={styles.payrollHrsCell}>
												{/* Show actual worked hours once a shift is completed; fall back to scheduled duration */}
												{shift.hoursWorked != null ? `${shift.hoursWorked} h` : `${dur} h`}
											</td>
											<td>
												<div className={styles.payrollStatusCell}>
													<span
														className={styles.payrollStatus}
														style={{ background: sc.bg, color: sc.color }}
													>
														{sc.label}
													</span>
													{shift.extraHours?.ackStatus === "pending" && (
														<span className={styles.payrollOvertimePending}>Overtime Pending</span>
													)}
												</div>
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					</div>

					{totalPages > 1 && (
						<div className={styles.payrollPagination}>
							<button
								className={styles.payrollPageBtn}
								disabled={payrollPage === 1}
								onClick={() => setPayrollPage((p) => p - 1)}
							>
								&#8249; Prev
							</button>
							<span className={styles.payrollPageInfo}>
								Page {payrollPage} of {totalPages}
								<span className={styles.payrollPageTotal}> &middot; {sorted.length} shifts</span>
							</span>
							<button
								className={styles.payrollPageBtn}
								disabled={payrollPage === totalPages}
								onClick={() => setPayrollPage((p) => p + 1)}
							>
								Next &#8250;
							</button>
						</div>
					)}
				</>
			)}
		</div>
	);
}
