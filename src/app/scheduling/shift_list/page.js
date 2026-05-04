"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useShifts } from "@/hooks/useShifts";
import { useProfile } from "@/hooks/useProfile";
import { utcToDisplayTime, utcToWeekday, utcToDate } from "@/utils/timeHandling";
import Button from "@components/UI/Button";
import PageLayout from "@components/layout/PageLayout";
import { User, MapPin, ClipboardList, Clock, ChevronRight, Undo2, Globe } from "lucide-react";
import styles from "./shift_list.module.css";
import Link from "next/link";

export default function ShiftListPage() {
	const searchParams = useSearchParams();
	const router = useRouter();

	// ?startDate=<ISO>&endDate=<ISO> — from week/day view slot click
	const startParam = searchParams.get("startDate");
	const endParam = searchParams.get("endDate");

	// Fetch all shifts within the time slot
	const { shifts = [], isShiftLoading } = useShifts({
		startDateTime: startParam,
		endDateTime: endParam,
	});
	const { profile } = useProfile();

	const timeRange =
		startParam && endParam
			? `${utcToDisplayTime(startParam, profile?.timezone || "America/Halifax")} – ${utcToDisplayTime(endParam, profile?.timezone || "America/Halifax")}`
			: "";

	const statusClass = (status) =>
		styles[`status_${status}`] || styles.status_default;

	return (
		<PageLayout>
			{/* ── Header ── */}
			<header className={styles.header}>
				<div className={styles.titleBlock}>
					<span className={styles.dateLabel}>{utcToWeekday(startParam, profile?.timezone || "America/Halifax")}</span>
					<h1 className={styles.heading}>{utcToDate(startParam, profile?.timezone || "America/Halifax")}</h1>
					<div className={styles.metaRow}>
						{timeRange && (
							<span className={styles.timeRangePill}>
								<Clock size={13} />
								{timeRange}
							</span>
						)}
						{!isShiftLoading && (
							<span className={styles.countBadge}>
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
					[1, 2].map((i) => (
						<div key={i} className={styles.shiftCard} style={{ opacity: 0.4, pointerEvents: "none" }}>
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
								{/* Time block */}
								<div className={styles.timeBlock}>
									<span className={styles.timeRange}>
										{utcToDisplayTime(shift.startTime, profile?.timezone || "America/Halifax")} – {utcToDisplayTime(shift.endTime, profile?.timezone || "America/Halifax")}
									</span>
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
						<Clock size={36} />
						<span>No shifts found for this time slot.</span>
					</div>
				)}
			</div>
		</PageLayout>
	);
}