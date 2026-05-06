"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useShifts } from "@/hooks/useShifts";
import { useProfile } from "@/hooks/useProfile";
import { utcToDate, utcToWeekday, utcToDisplayTime } from "@/utils/timeHandling";
import Button from "@components/UI/Button";
import PageLayout from "@components/layout/PageLayout";
import { User, MapPin, ClipboardList, Clock, ChevronRight, Undo2, CalendarDays, Globe } from "lucide-react";
import styles from "./shift_day.module.css";
import Link from "next/link";

export default function ShiftDayPage() {
	const searchParams = useSearchParams();
	const router = useRouter();

	// ?date=yyyy-MM-dd — from month view click
	const dateParam = searchParams.get("date");

	// Fetch all shifts (no server-side filter — filter client-side by date)
	const { shifts, isShiftLoading } = useShifts({ startDate: dateParam });
	const { profile } = useProfile();



	const statusClass = (status) =>
		styles[`status_${status}`] || styles.status_default;

	return (
		<PageLayout>
			{/* ── Header ── */}
			<header className={styles.header}>
				<div className={styles.titleBlock}>
					<span className={styles.dateLabel}>{utcToWeekday(dateParam, profile?.timezone || "America/Halifax")}</span>
					<h1 className={styles.heading}>{utcToDate(dateParam, profile?.timezone || "America/Halifax")}</h1>
					<div className={styles.metaRow}>
						{!isShiftLoading && (
							<span className={styles.countBadge}>
								<CalendarDays size={13} />
								{shifts.length} shift{shifts.length !== 1 ? "s" : ""}
							</span>
						)}
						<span className={styles.tzBadge}>
							<Globe size={11} />
							{profile?.timezone || "America/Halifax"}
						</span>
					</div>
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
				) : shifts.length > 0 ? (
					shifts.map((shift) => {
						const shiftId = shift._id || shift.id;
						const startTime = shift.startTime
							? utcToDisplayTime(shift.startTime, profile?.timezone || "America/Halifax")
							: "--:--";
						const endTime = shift.endTime
							? utcToDisplayTime(shift.endTime, profile?.timezone || "America/Halifax")
							: "--:--";
						const caregiverName =
							shift.caregiver?.firstName || shift.caregiver?.lastName
								? `${shift.caregiver.firstName ?? ""} ${shift.caregiver.lastName ?? ""}`.trim()
								: "Unassigned";
						const targetName = shift.client
							? `Client: ${shift.client.firstName ?? ""} ${shift.client.lastName ?? ""}`.trim()
							: shift.home
							? `Home: ${shift.home.name || shift.home._id || shift.home.id || ""}`.trim()
							: "—";

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
									<span className={styles.timeTz}>
										<Globe size={9} />
										{(profile?.timezone || "America/Halifax").replace("America/", "")}
									</span>
								</div>

								{/* Main info */}
								<div className={styles.mainInfo}>
									{/* Caregiver */}
									<div className={styles.infoRow}>
										<User size={16} className={styles.icon} />
										<span className={styles.primaryText}>{caregiverName}</span>
									</div>

									{/* Target (Client/Home) */}
									<div className={styles.infoRow}>
										<ClipboardList size={16} className={styles.icon} />
										<span className={styles.secondaryText}>{targetName}</span>
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
