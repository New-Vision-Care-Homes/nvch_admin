"use client";

import React, { useState, useMemo } from "react";
import styles from "./Shifts.module.css";
import { Eye, Filter, Calendar, AlertCircle } from "lucide-react";
import { Table, TableHeader, TableCell, TableContent } from "@components/UI/Table";
import Button from "@components/UI/Button";
import IconButton from "@components/UI/IconButton";
import { useShifts } from "@/hooks/useShifts";
import { useParams, useRouter } from "next/navigation";
import { DateTime } from "luxon";
import Pagination from "@components/UI/Pagination";

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const ITEMS_PER_PAGE = 10;
const HALIFAX_TZ = "America/Halifax";

const STATUS_COLORS = {
	scheduled:   { bg: "#E0E7FF", color: "#4338CA", border: "#A5B4FC" },
	in_progress: { bg: "#FEF3C7", color: "#92400E", border: "#FDE68A" },
	completed:   { bg: "#D1FAE5", color: "#065F46", border: "#A7F3D0" },
	cancelled:   { bg: "#FEE2E2", color: "#991B1B", border: "#FECACA" },
	missed:      { bg: "#F3F4F6", color: "#6B7280", border: "#D1D5DB" },
};

const STATUS_OPTIONS = [
	{ value: "",            label: "All" },
	{ value: "scheduled",   label: "Scheduled" },
	{ value: "in_progress", label: "In Progress" },
	{ value: "completed",   label: "Completed" },
	{ value: "cancelled",   label: "Cancelled" },
	{ value: "missed",      label: "Missed" },
];

const DATE_PRESETS = [
	{ value: "all",    label: "All Time" },
	{ value: "today",  label: "Today" },
	{ value: "week",   label: "This Week" },
	{ value: "month",  label: "This Month" },
	{ value: "custom", label: "Custom" },
];

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const formatDateOnly = (iso) => {
	if (!iso) return "—";
	return DateTime.fromISO(iso, { zone: "utc" }).setZone(HALIFAX_TZ).toFormat("MMM d, yyyy");
};

const formatTimeOnly = (iso) => {
	if (!iso) return "—";
	return DateTime.fromISO(iso, { zone: "utc" }).setZone(HALIFAX_TZ).toFormat("h:mm a");
};

const formatStatusLabel = (status = "") =>
	status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function Shifts() {
	const { id } = useParams();
	const router = useRouter();

	const [statusFilter, setStatusFilter] = useState("");
	const [datePreset, setDatePreset]     = useState("all");
	const [customStart, setCustomStart]   = useState("");
	const [customEnd, setCustomEnd]       = useState("");
	const [currentPage, setCurrentPage]   = useState(1);

	// Derive date params from the selected preset
	const dateParams = useMemo(() => {
		const now = DateTime.now().setZone(HALIFAX_TZ);
		switch (datePreset) {
			case "today": {
				const date = now.toFormat("yyyy-MM-dd");
				return { startDate: date, endDate: date };
			}
			case "week":
				return {
					startDate: now.startOf("week").toFormat("yyyy-MM-dd"),
					endDate:   now.endOf("week").toFormat("yyyy-MM-dd"),
				};
			case "month":
				return {
					startDate: now.startOf("month").toFormat("yyyy-MM-dd"),
					endDate:   now.endOf("month").toFormat("yyyy-MM-dd"),
				};
			case "custom":
				if (!customStart) return {};
				return {
					startDate: customStart,
					...(customEnd ? { endDate: customEnd } : {}),
				};
			default:
				return {};
		}
	}, [datePreset, customStart, customEnd]);

	// When a date range is active, backend ignores page/limit and returns all in range
	const hasDateFilter = Object.keys(dateParams).length > 0;

	const queryParams = {
		caregiverId: id,
		...(statusFilter ? { status: statusFilter } : {}),
		...dateParams,
		...(!hasDateFilter ? { page: currentPage, limit: ITEMS_PER_PAGE } : {}),
	};

	const { shifts, totalPages, isShiftLoading } = useShifts({ params: queryParams });

	const showPagination = !hasDateFilter && totalPages > 1;

	// ── Handlers ──────────────────────────────────────────────────────────────

	const handleStatusChange = (value) => {
		setStatusFilter(value);
		setCurrentPage(1);
	};

	const handleDatePreset = (value) => {
		setDatePreset(value);
		setCurrentPage(1);
		if (value !== "custom") {
			setCustomStart("");
			setCustomEnd("");
		}
	};

	// ── Render ────────────────────────────────────────────────────────────────

	return (
		<div className={styles.container}>

			{/* ── Filter Bar ──────────────────────────────────────────────── */}
			<div className={styles.filterBar}>

				{/* Status pills */}
				<div className={styles.filterSection}>
					<div className={styles.filterLabel}>
						<Filter size={12} />
						Status
					</div>
					<div className={styles.pillGroup}>
						{STATUS_OPTIONS.map((opt) => (
							<button
								key={opt.value}
								className={`${styles.pill} ${statusFilter === opt.value ? styles.pillActive : ""}`}
								onClick={() => handleStatusChange(opt.value)}
							>
								{opt.label}
							</button>
						))}
					</div>
				</div>

				{/* Date preset pills */}
				<div className={styles.filterSection}>
					<div className={styles.filterLabel}>
						<Calendar size={12} />
						Date Range
					</div>
					<div className={styles.pillGroup}>
						{DATE_PRESETS.map((opt) => (
							<button
								key={opt.value}
								className={`${styles.pill} ${datePreset === opt.value ? styles.pillActive : ""}`}
								onClick={() => handleDatePreset(opt.value)}
							>
								{opt.label}
							</button>
						))}
					</div>
				</div>

				{/* Custom date inputs */}
				{!isShiftLoading && (
					<span className={styles.resultCount}>
						{shifts?.length ?? 0} shift{shifts?.length !== 1 ? "s" : ""}
						{hasDateFilter ? " in range" : " on this page"}
					</span>
				)}

				{datePreset === "custom" && (
					<div className={styles.customDateRow}>
						<div className={styles.dateField}>
							<label className={styles.dateLabel}>From</label>
							<input
								type="date"
								className={styles.dateInput}
								value={customStart}
								onChange={(e) => { setCustomStart(e.target.value); setCurrentPage(1); }}
							/>
						</div>
						<span className={styles.dateDash}>—</span>
						<div className={styles.dateField}>
							<label className={styles.dateLabel}>To</label>
							<input
								type="date"
								className={styles.dateInput}
								value={customEnd}
								min={customStart || undefined}
								onChange={(e) => { setCustomEnd(e.target.value); setCurrentPage(1); }}
							/>
						</div>
					</div>
				)}
			</div>

			{/* ── Table ───────────────────────────────────────────────────── */}
			<Table>
				<TableHeader>
					<TableCell>Status</TableCell>
					<TableCell>Date</TableCell>
					<TableCell>Shift Times</TableCell>
					<TableCell>Client / Home</TableCell>
					<TableCell>Details</TableCell>
				</TableHeader>

				{isShiftLoading ? (
					<TableContent>
						<TableCell colSpan={5}>
							<div className={styles.stateCell}>
								<div className={styles.spinner} />
								Loading shifts…
							</div>
						</TableCell>
					</TableContent>
				) : shifts && shifts.length > 0 ? (
					shifts.map((shift) => {
						const shiftId = shift._id;
						const normalizedStatus = (shift.status || "scheduled")
							.toLowerCase().replace(/\s+/g, "_");
						const statusStyle = STATUS_COLORS[normalizedStatus] ?? STATUS_COLORS.scheduled;
						const clientOrHome = shift.client
							? `${shift.client.firstName} ${shift.client.lastName}`
							: (shift.home?.name ?? <span className={styles.muted}>—</span>);

						return (
							<TableContent key={shiftId}>
								<TableCell>
									<span className={styles.statusPill} style={{
										background: statusStyle.bg,
										color: statusStyle.color,
										border: `1px solid ${statusStyle.border}`,
									}}>
										{formatStatusLabel(normalizedStatus)}
									</span>
								</TableCell>
								<TableCell>{formatDateOnly(shift.startTime)}</TableCell>
								<TableCell className={styles.timeCell}>
									<span>{formatTimeOnly(shift.startTime)}</span>
									<span className={styles.timeSep}>–</span>
									<span>{formatTimeOnly(shift.endTime)}</span>
								</TableCell>
								<TableCell>{clientOrHome}</TableCell>
								<TableCell>
									<IconButton
										onClick={() => router.push(`/scheduling/${shiftId}`)}
										title="View Shift Details"
									>
										<Eye size={15} />
									</IconButton>
								</TableCell>
							</TableContent>
						);
					})
				) : (
					<TableContent>
						<TableCell colSpan={5}>
							<div className={styles.stateCell}>
								<AlertCircle size={20} color="#9ca3af" />
								No shifts found for the selected filters.
							</div>
						</TableCell>
					</TableContent>
				)}
			</Table>

			{!hasDateFilter && <Pagination pageCount={totalPages} forcePage={currentPage - 1} onPageChange={(e) => setCurrentPage(e.selected + 1)} />}

		</div>
	);
}
