"use client";

import React, { useState, useRef } from "react";
import styles from "./Shifts.module.css";
import { ChevronRight, History, ExternalLink } from "lucide-react";
import { Table, TableHeader, TableCell, TableContent } from "@components/UI/Table";
import Button from "@components/UI/Button";
import { useShifts } from "@/hooks/useShifts";
import { useHours } from "@/hooks/useHours";
import { useParams, useRouter } from "next/navigation";
import ReactPaginate from "react-paginate";

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const ITEMS_PER_PAGE = 5;

// Color mapping for the approval status pill
const APPROVAL_STATUS_COLORS = {
	pending: { bg: "#FEF3C7", color: "#92400E", border: "#FDE68A" },
	approved: { bg: "#D1FAE5", color: "#065F46", border: "#A7F3D0" },
	rejected: { bg: "#FEE2E2", color: "#991B1B", border: "#FECACA" },
};

// Color mapping for shift status pill
const STATUS_COLORS = {
	scheduled: { bg: "#E0E7FF", color: "#4338CA", border: "#A5B4FC" },
	in_progress: { bg: "#FEF3C7", color: "#92400E", border: "#FDE68A" },
	completed: { bg: "#D1FAE5", color: "#065F46", border: "#A7F3D0" },
	cancelled: { bg: "#FEE2E2", color: "#991B1B", border: "#FECACA" },
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const formatDateOnly = (iso) => {
	if (!iso) return "—";
	return new Date(iso).toLocaleDateString("en-US", {
		month: "short", day: "numeric", year: "numeric",
	});
};

const formatTimeOnly = (iso) => {
	if (!iso) return "—";
	return new Date(iso).toLocaleTimeString("en-US", {
		hour: "numeric", minute: "2-digit", hour12: true,
	});
};

const formatStatusLabel = (status = "") =>
	status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());


// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function Shifts() {
	const { id } = useParams();
	const router = useRouter();

	const [activeTab, setActiveTab] = useState("upcoming");
	const [currentPage, setCurrentPage] = useState(1);
	const [pastPage, setPastPage] = useState(1);

	// Build startDateTime as a Halifax local datetime string (YYYY-MM-DDTHH:mm:ss)
	// without the trailing Z: toISOString() gives UTC, but the backend
	// describes this param as a "Halifax datetime string" so we pass local time.
	const nowIsoRef = useRef((() => {
		const now = new Date();
		const pad = (n) => String(n).padStart(2, "0");
		return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
	})());

	// --- Upcoming shifts: use startFrom filter so the backend returns only future shifts ---
	const {
		shifts,
		totalPages,
		isShiftLoading,
	} = useShifts({
		params: {
			caregiverId: id,
			page: currentPage,
			limit: ITEMS_PER_PAGE,
			startDateTime: nowIsoRef.current,
		},
	});

	console.log("startDateTime being sent:", nowIsoRef.current);
	console.log("shifts: ", shifts);

	// --- Past shifts: use hourHistory ---
	const { hourHistory, isLoading: isHistoryLoading } = useHours(id);
	console.log("hors: ", hourHistory);

	// Client-side pagination for history (the hook returns all records)
	const historyList = hourHistory?.history ?? [];
	const historyTotal = hourHistory?.pagination?.total ?? historyList.length;
	const historyPages = hourHistory?.pagination?.pages ?? Math.ceil(historyList.length / ITEMS_PER_PAGE);
	const pagedHistory = historyList.slice(
		(pastPage - 1) * ITEMS_PER_PAGE,
		pastPage * ITEMS_PER_PAGE
	);

	// ─────────────────────────────────────────────────────────────────────────
	// RENDER
	// ─────────────────────────────────────────────────────────────────────────

	return (
		<div className={styles.container}>

			{/* ── Header ──────────────────────────────────────────────────── */}
			<div className={styles.header}>
				<h2>Shifts & Schedule</h2>
			</div>

			{/* ── Tab Header ──────────────────────────────────────────────── */}
			<div className={styles.tabsHeader}>
				<button
					className={`${styles.tabBtn} ${activeTab === "upcoming" ? styles.tabBtnActive : ""}`}
					onClick={() => setActiveTab("upcoming")}
				>
					<ChevronRight size={15} />
					Upcoming Shifts
					{shifts?.length > 0 && (
						<span className={styles.tabBadge}>{shifts.length}</span>
					)}
				</button>
				<button
					className={`${styles.tabBtn} ${activeTab === "past" ? styles.tabBtnActive : ""}`}
					onClick={() => setActiveTab("past")}
				>
					<History size={15} />
					Past Shifts
					{historyTotal > 0 && (
						<span className={styles.tabBadge}>{historyTotal}</span>
					)}
				</button>
			</div>

			{/* ── Upcoming Shifts Tab ──────────────────────────────────────── */}
			{activeTab === "upcoming" && (
				<>
					<Table>
						<TableHeader>
							<TableCell>Status</TableCell>
							<TableCell>Date</TableCell>
							<TableCell>Shift Times</TableCell>
							<TableCell>Client</TableCell>
							<TableCell>Action</TableCell>
						</TableHeader>

						{isShiftLoading ? (
							<TableContent>
								<TableCell colSpan={5} style={{ textAlign: "center", padding: "2rem", color: "#6b7280" }}>
									Loading…
								</TableCell>
							</TableContent>
						) : shifts && shifts.length > 0 ? (
							shifts.map((shift) => {
								const shiftId = shift._id;
								const normalizedStatus = (shift.status || "scheduled")
									.toLowerCase().replace(/\s+/g, "_");
								const statusStyle = STATUS_COLORS[normalizedStatus] || STATUS_COLORS.scheduled;

								return (
									<TableContent key={shiftId}>
										<TableCell>
											<span style={{
												display: "inline-block",
												padding: "2px 10px",
												borderRadius: "9999px",
												fontSize: "0.78rem",
												fontWeight: 600,
												background: statusStyle.bg,
												color: statusStyle.color,
												border: `1px solid ${statusStyle.border}`,
											}}>
												{formatStatusLabel(normalizedStatus)}
											</span>
										</TableCell>
										<TableCell>{formatDateOnly(shift.startTime)}</TableCell>
										<TableCell>
											{formatTimeOnly(shift.startTime)} – {formatTimeOnly(shift.endTime)}
										</TableCell>
										<TableCell>
											{shift.client?.firstName || ""} {shift.client?.lastName || ""}
										</TableCell>
										<TableCell>
											<Button
												variant="ghost"
												size="sm"
												style={{ padding: "0.25rem 0.5rem" }}
												onClick={() => router.push(`/scheduling/${shiftId}`)}
												title="View Shift Details"
											>
												<ExternalLink size={16} color="var(--color-secondary)" />
											</Button>
										</TableCell>
									</TableContent>
								);
							})
						) : (
							<TableContent>
								<TableCell colSpan={5} style={{ textAlign: "center", padding: "2rem", color: "#6b7280" }}>
									No upcoming shifts found.
								</TableCell>
							</TableContent>
						)}
					</Table>

					{totalPages > 1 && (
						<ReactPaginate
							pageCount={Math.max(totalPages, 1)}
							forcePage={currentPage - 1}
							onPageChange={(e) => setCurrentPage(e.selected + 1)}
							pageRangeDisplayed={3}
							marginPagesDisplayed={1}
							previousLabel="Prev"
							nextLabel="Next"
							containerClassName={styles.pagination}
							pageClassName={styles.pageItem}
							pageLinkClassName={styles.pageLink}
							previousClassName={styles.pageItem}
							previousLinkClassName={styles.pageLink}
							nextClassName={styles.pageItem}
							nextLinkClassName={styles.pageLink}
							activeClassName={styles.pageActive}
						/>
					)}
				</>
			)}

			{/* ── Past Shifts Tab (hourHistory) ────────────────────────────── */}
			{activeTab === "past" && (
				<>
					<Table>
						<TableHeader>
							<TableCell>Date</TableCell>
							<TableCell>Shift Times</TableCell>
							<TableCell>Actual Times</TableCell>
							<TableCell>Client</TableCell>
							<TableCell>Hours Worked</TableCell>
							<TableCell>Overtime</TableCell>
							<TableCell>Approval</TableCell>
							<TableCell>Action</TableCell>
						</TableHeader>

						{isHistoryLoading ? (
							<TableContent>
								<TableCell colSpan={8} style={{ textAlign: "center", padding: "2rem", color: "#6b7280" }}>
									Loading…
								</TableCell>
							</TableContent>
						) : pagedHistory.length > 0 ? (
							pagedHistory.map((record) => {
								const approvalKey = (record.approvalStatus || "pending").toLowerCase();
								const approvalStyle = APPROVAL_STATUS_COLORS[approvalKey] || APPROVAL_STATUS_COLORS.pending;

								return (
									<TableContent key={record.id}>
										<TableCell>{formatDateOnly(record.date)}</TableCell>
										<TableCell>
											{formatTimeOnly(record.shiftTimes?.start)} – {formatTimeOnly(record.shiftTimes?.end)}
										</TableCell>
										<TableCell>
											{record.shiftTimes?.actualStart
												? `${formatTimeOnly(record.shiftTimes.actualStart)} – ${formatTimeOnly(record.shiftTimes.actualEnd)}`
												: <span style={{ color: "#9ca3af", fontStyle: "italic" }}>Not recorded</span>
											}
										</TableCell>
										<TableCell>
											{record.client
												? `${record.client.firstName} ${record.client.lastName}`
												: <span style={{ color: "#9ca3af" }}>—</span>
											}
										</TableCell>
										<TableCell>
											<span style={{ fontWeight: 600, color: "var(--color-primary)" }}>
												{record.hoursWorked ?? "—"}
											</span>
										</TableCell>
										<TableCell>
											{record.overtimeHours > 0
												? <span style={{ color: "#f59e0b", fontWeight: 600 }}>{record.overtimeHours}h</span>
												: <span style={{ color: "#9ca3af" }}>—</span>
											}
										</TableCell>
										<TableCell>
											<span style={{
												display: "inline-block",
												padding: "2px 10px",
												borderRadius: "9999px",
												fontSize: "0.78rem",
												fontWeight: 600,
												background: approvalStyle.bg,
												color: approvalStyle.color,
												border: `1px solid ${approvalStyle.border}`,
											}}>
												{formatStatusLabel(record.approvalStatus || "pending")}
											</span>
										</TableCell>
										<TableCell>
											<Button
												variant="ghost"
												size="sm"
												style={{ padding: "0.25rem 0.5rem" }}
												onClick={() => router.push(`/scheduling/${record.id}`)}
												title="View Shift Details"
											>
												<ExternalLink size={16} color="var(--color-secondary)" />
											</Button>
										</TableCell>
									</TableContent>
								);
							})
						) : (
							<TableContent>
								<TableCell colSpan={8} style={{ textAlign: "center", padding: "2rem", color: "#6b7280" }}>
									No past shift history found.
								</TableCell>
							</TableContent>
						)}
					</Table>

					{historyPages > 1 && (
						<ReactPaginate
							pageCount={Math.max(historyPages, 1)}
							forcePage={pastPage - 1}
							onPageChange={(e) => setPastPage(e.selected + 1)}
							pageRangeDisplayed={3}
							marginPagesDisplayed={1}
							previousLabel="Prev"
							nextLabel="Next"
							containerClassName={styles.pagination}
							pageClassName={styles.pageItem}
							pageLinkClassName={styles.pageLink}
							previousClassName={styles.pageItem}
							previousLinkClassName={styles.pageLink}
							nextClassName={styles.pageItem}
							nextLinkClassName={styles.pageLink}
							activeClassName={styles.pageActive}
						/>
					)}
				</>
			)}

		</div>
	);
}