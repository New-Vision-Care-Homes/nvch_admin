"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useShifts } from "@/hooks/useShifts";
import { format } from "date-fns";
import Button from "@components/UI/Button";
import PageLayout from "@components/layout/PageLayout";
import { User, MapPin, ClipboardList, Clock, ChevronRight, Undo2, CalendarDays } from "lucide-react";
import styles from "./shift_day.module.css";
import Link from "next/link";

export default function ShiftDayPage() {
	const searchParams = useSearchParams();
	const router = useRouter();

	// ?date=yyyy-MM-dd — from month view click
	const dateParam = searchParams.get("date");

	// Fetch all shifts (no server-side filter — filter client-side by date)
	const { shifts = [], isShiftLoading } = useShifts({});

	// Filter: match shifts whose local calendar date equals dateParam
	const filteredShifts = shifts.filter((shift) => {
		if (!dateParam) return true;
		const shiftStart = new Date(shift.startTime);
		return format(shiftStart, "yyyy-MM-dd") === dateParam;
	});

	// Sort chronologically by start time
	const sortedShifts = [...filteredShifts].sort(
		(a, b) => new Date(a.startTime) - new Date(b.startTime)
	);

	// Display helpers — parse as noon to avoid UTC midnight off-by-one
	const displayDate = dateParam
		? format(new Date(dateParam + "T12:00:00"), "EEEE, MMMM d, yyyy")
		: "Day View";

	const shortDate = dateParam
		? format(new Date(dateParam + "T12:00:00"), "MMM d, yyyy")
		: "";

	const statusClass = (status) =>
		styles[`status_${status}`] || styles.status_default;

	return (
		<PageLayout>
			{/* ── Header ── */}
			<header className={styles.header}>
				<div className={styles.titleBlock}>
					<span className={styles.dateLabel}>{shortDate}</span>
					<h1 className={styles.heading}>{displayDate}</h1>
					{!isShiftLoading && (
						<span className={styles.countBadge}>
							<CalendarDays size={13} />
							{sortedShifts.length} shift{sortedShifts.length !== 1 ? "s" : ""}
						</span>
					)}
				</div>
				<Link href="/scheduling">
					<Button icon={<Undo2 size={16} />} variant="secondary">
						Back to Calendar
					</Button>
				</Link>
			</header>

			{/* ── Shift list ── */}
			<div className={styles.shiftList}>
				{isShiftLoading ? (
					/* Loading skeletons */
					[1, 2, 3].map((i) => (
						<div key={i} className={styles.shiftCard} style={{ opacity: 0.4, pointerEvents: "none" }}>
							<div className={styles.timeCol}>
								<span className={styles.timeStart}>--:--</span>
								<span className={styles.timeSep}>to</span>
								<span className={styles.timeEnd}>--:--</span>
							</div>
							<div className={styles.mainInfo}>
								<div className={styles.infoRow}>
									<User size={16} className={styles.icon} />
									<span className={styles.primaryText}>Loading…</span>
								</div>
							</div>
						</div>
					))
				) : sortedShifts.length > 0 ? (
					sortedShifts.map((shift) => {
						const shiftId = shift._id || shift.id;
						const startTime = shift.startTime
							? format(new Date(shift.startTime), "HH:mm")
							: "--:--";
						const endTime = shift.endTime
							? format(new Date(shift.endTime), "HH:mm")
							: "--:--";
						const caregiverName =
							shift.caregiver?.firstName || shift.caregiver?.lastName
								? `${shift.caregiver.firstName ?? ""} ${shift.caregiver.lastName ?? ""}`.trim()
								: "Unassigned";
						const clientName =
							shift.client?.firstName || shift.client?.lastName
								? `${shift.client.firstName ?? ""} ${shift.client.lastName ?? ""}`.trim()
								: shift.client?.fullName || "—";

						return (
							<div
								key={shiftId}
								className={styles.shiftCard}
								onClick={() => router.push(`/scheduling/${shiftId}`)}
							>
								{/* Time column */}
								<div className={styles.timeCol}>
									<span className={styles.timeStart}>{startTime}</span>
									<span className={styles.timeSep}>to</span>
									<span className={styles.timeEnd}>{endTime}</span>
								</div>

								{/* Main info */}
								<div className={styles.mainInfo}>
									{/* Caregiver */}
									<div className={styles.infoRow}>
										<User size={16} className={styles.icon} />
										<span className={styles.primaryText}>{caregiverName}</span>
									</div>

									{/* Client */}
									<div className={styles.infoRow}>
										<ClipboardList size={16} className={styles.icon} />
										<span className={styles.secondaryText}>{clientName}</span>
									</div>

									{/* Location */}
									{shift.clientAddress && (
										<div className={styles.infoRow}>
											<MapPin size={16} className={styles.icon} />
											<span className={styles.secondaryText}>{shift.clientAddress}</span>
										</div>
									)}
								</div>

								{/* Status badge */}
								<span className={`${styles.statusBadge} ${statusClass(shift.status)}`}>
									{shift.status?.replace(/_/g, " ") || "—"}
								</span>

								{/* View button */}
								<button
									className={styles.viewBtn}
									onClick={(e) => {
										e.stopPropagation();
										router.push(`/scheduling/${shiftId}`);
									}}
								>
									<span>View Detail</span>
									<ChevronRight size={16} />
								</button>
							</div>
						);
					})
				) : (
					<div className={styles.emptyState}>
						<CalendarDays size={36} />
						<span>No shifts scheduled for this day.</span>
					</div>
				)}
			</div>
		</PageLayout>
	);
}
