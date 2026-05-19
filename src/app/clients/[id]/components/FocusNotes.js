"use client";

import React, { useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useFocusNotes } from "@/hooks/useFocusNotes";
import { utcToFullDisplay } from "@/utils/timeHandling";
import ErrorState from "@components/UI/ErrorState";
import { FileText, Download, Search, ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import styles from "./FocusNotes.module.css";

// ─────────────────────────────────────────────────────────────────────────────
// Mock data — shown when the real API returns nothing (for layout preview)
// ─────────────────────────────────────────────────────────────────────────────
const MOCK_NOTES = [
	{
		_id: "fn_001",
		createdAt: "2026-10-25T16:30:00.000Z",
		createdByRole: "caregiver",
		createdBy: { firstName: "Alex", lastName: "Stone", email: "alex@example.com" },
		shift: { startTime: "2026-10-25T12:00:00.000Z", endTime: "2026-10-25T20:00:00.000Z", status: "completed" },
		opportunitiesConcerns: "Family asked about weekend coverage options.",
		successes: "Completed medication pass and evening routine on time.",
		generalNotes: "Handoff to night staff completed verbally.",
		updatedBy: null,
		updatedByRole: null,
	},
	{
		_id: "fn_002",
		createdAt: "2026-10-26T09:15:00.000Z",
		createdByRole: "caregiver",
		createdBy: { firstName: "Maria", lastName: "Chen", email: "maria@example.com" },
		shift: { startTime: "2026-10-26T08:00:00.000Z", endTime: "2026-10-26T16:00:00.000Z", status: "completed" },
		opportunitiesConcerns: "",
		successes: "Client was in good spirits. Bath completed without resistance.",
		generalNotes: "Reminded client about upcoming doctor's appointment on the 28th.",
		updatedBy: { firstName: "Admin", lastName: "User" },
		updatedByRole: "admin",
	},
	{
		_id: "fn_003",
		createdAt: "2026-10-27T20:45:00.000Z",
		createdByRole: "supervisor",
		createdBy: { firstName: "James", lastName: "Wright", email: "james@example.com" },
		shift: { startTime: "2026-10-27T12:00:00.000Z", endTime: "2026-10-27T20:00:00.000Z", status: "in_progress" },
		opportunitiesConcerns: "Client expressed concern about pain levels increasing in the evening.",
		successes: "Physiotherapy exercises completed for the first time this week.",
		generalNotes: "",
		updatedBy: null,
		updatedByRole: null,
	},
];

const TZ = "America/Halifax";
const PAGE_SIZE = 10;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function personName(obj) {
	if (!obj) return "—";
	return `${obj.firstName || ""} ${obj.lastName || ""}`.trim() || obj.email || "—";
}

function truncate(str, n = 60) {
	if (!str) return <span className={styles.cellEmpty}>—</span>;
	return str.length > n ? str.slice(0, n) + "…" : str;
}

const STATUS_CLASS = {
	scheduled: styles.statusScheduled,
	in_progress: styles.statusInProgress,
	completed: styles.statusCompleted,
	cancelled: styles.statusCancelled,
	missed: styles.statusMissed,
};

const ROLE_CLASS = {
	caregiver: styles.roleCaregiver,
	admin: styles.roleAdmin,
	supervisor: styles.roleSupervisor,
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export default function FocusNotes() {
	const { id } = useParams();
	const router = useRouter();

	const { focusNotesOfClient, isFocusNotesOfClientLoading, fetchError } = useFocusNotes(id);

	// Use real data if available, fall back to mock for layout preview
	const allNotes = focusNotesOfClient.length > 0 ? focusNotesOfClient : MOCK_NOTES;
	const isMock = focusNotesOfClient.length === 0 && !isFocusNotesOfClientLoading && !fetchError;

	// ── Filter + search state
	const [search, setSearch] = useState("");
	const [roleFilter, setRoleFilter] = useState("all");
	const [statusFilter, setStatusFilter] = useState("all");
	const [page, setPage] = useState(1);

	// ── Filtered + paginated data
	const filtered = useMemo(() => {
		return allNotes.filter((n) => {
			const matchSearch =
				!search ||
				personName(n.createdBy).toLowerCase().includes(search.toLowerCase()) ||
				(n.opportunitiesConcerns || "").toLowerCase().includes(search.toLowerCase()) ||
				(n.successes || "").toLowerCase().includes(search.toLowerCase()) ||
				(n.generalNotes || "").toLowerCase().includes(search.toLowerCase());

			const matchRole = roleFilter === "all" || n.createdByRole === roleFilter;
			const matchStatus = statusFilter === "all" || n.shift?.status === statusFilter;

			return matchSearch && matchRole && matchStatus;
		});
	}, [allNotes, search, roleFilter, statusFilter]);

	const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
	const currentPage = Math.min(page, totalPages);
	const pageNotes = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

	const handleSearchChange = (e) => { setSearch(e.target.value); setPage(1); };
	const handleRoleChange = (e) => { setRoleFilter(e.target.value); setPage(1); };
	const handleStatusChange = (e) => { setStatusFilter(e.target.value); setPage(1); };

	if (isFocusNotesOfClientLoading || fetchError) {
		return <ErrorState isLoading={isFocusNotesOfClientLoading} errorMessage={fetchError} />;
	}

	return (
		<div className={styles.root}>

			{/* ── Toolbar ─────────────────────────────────────────── */}
			<div className={styles.toolbar}>
				<div className={styles.toolbarLeft}>
					<FileText size={16} className={styles.toolbarIcon} />
					<span className={styles.toolbarTitle}>Focus Notes</span>
					<span className={styles.countBadge}>{filtered.length}</span>
					{isMock && (
						<span className={styles.mockBadge}>Preview — no data yet</span>
					)}
				</div>
				<div className={styles.toolbarRight}>
					{/* Export buttons — logic wired later */}
					<button className={styles.exportBtn} disabled title="Coming soon">
						<Download size={13} />
						Export Excel
					</button>
					<button className={`${styles.exportBtn} ${styles.exportBtnPdf}`} disabled title="Coming soon">
						<Download size={13} />
						Export PDF
					</button>
				</div>
			</div>

			{/* ── Filter bar ──────────────────────────────────────── */}
			<div className={styles.filterBar}>
				<div className={styles.searchWrap}>
					<Search size={14} className={styles.searchIcon} />
					<input
						className={styles.searchInput}
						placeholder="Search by author or note content…"
						value={search}
						onChange={handleSearchChange}
					/>
				</div>
				<select className={styles.filterSelect} value={roleFilter} onChange={handleRoleChange}>
					<option value="all">All Roles</option>
					<option value="caregiver">Caregiver</option>
					<option value="supervisor">Supervisor</option>
					<option value="admin">Admin</option>
				</select>
				<select className={styles.filterSelect} value={statusFilter} onChange={handleStatusChange}>
					<option value="all">All Shift Statuses</option>
					<option value="scheduled">Scheduled</option>
					<option value="in_progress">In Progress</option>
					<option value="completed">Completed</option>
					<option value="cancelled">Cancelled</option>
					<option value="missed">Missed</option>
				</select>
			</div>

			{/* ── Table ───────────────────────────────────────────── */}
			<div className={styles.tableWrap}>
				<table className={styles.table}>
					<thead>
						<tr>
							<th>Date</th>
							<th>Created By</th>
							<th>Role</th>
							<th>Shift Window</th>
							<th>Shift Status</th>
							<th>Opportunities / Concerns</th>
							<th>Successes</th>
							<th>General Notes</th>
							<th>Last Edited By</th>
							<th className={styles.thAction}></th>
						</tr>
					</thead>
					<tbody>
						{pageNotes.length === 0 ? (
							<tr>
								<td colSpan={10} className={styles.emptyRow}>
									<FileText size={28} className={styles.emptyIcon} />
									<p>No focus notes match your filters.</p>
								</td>
							</tr>
						) : (
							pageNotes.map((note) => {
								const shiftStart = note.shift?.startTime
									? utcToFullDisplay(note.shift.startTime, TZ)
									: "—";
								const shiftEnd = note.shift?.endTime
									? utcToFullDisplay(note.shift.endTime, TZ)
									: "—";
								const shiftStatus = note.shift?.status || null;

								return (
									<tr key={note._id} className={styles.row}>
										<td className={styles.tdDate}>
											{note.createdAt ? utcToFullDisplay(note.createdAt, TZ) : "—"}
										</td>
										<td className={styles.tdAuthor}>
											{personName(note.createdBy)}
										</td>
										<td>
											<span className={`${styles.roleBadge} ${ROLE_CLASS[note.createdByRole] || styles.roleDefault}`}>
												{note.createdByRole || "—"}
											</span>
										</td>
										<td className={styles.tdShift}>
											<span className={styles.shiftTime}>{shiftStart}</span>
											<span className={styles.shiftArrow}>→</span>
											<span className={styles.shiftTime}>{shiftEnd}</span>
										</td>
										<td>
											{shiftStatus ? (
												<span className={`${styles.statusBadge} ${STATUS_CLASS[shiftStatus] || ""}`}>
													{shiftStatus.replace(/_/g, " ")}
												</span>
											) : "—"}
										</td>
										<td className={styles.tdNote}>{truncate(note.opportunitiesConcerns)}</td>
										<td className={styles.tdNote}>{truncate(note.successes)}</td>
										<td className={styles.tdNote}>{truncate(note.generalNotes)}</td>
										<td className={styles.tdAuthor}>
											{note.updatedBy
												? <>{personName(note.updatedBy)} <span className={styles.updatedRole}>({note.updatedByRole})</span></>
												: <span className={styles.cellEmpty}>—</span>
											}
										</td>
										<td className={styles.tdAction}>
											<button
												className={styles.viewBtn}
												title="View focus note detail"
												onClick={() => router.push(`/focus_notes/${note._id}`)}
											>
												<ExternalLink size={14} />
											</button>
										</td>
									</tr>
								);
							})
						)}
					</tbody>
				</table>
			</div>

			{/* ── Pagination ──────────────────────────────────────── */}
			{totalPages > 1 && (
				<div className={styles.pagination}>
					<span className={styles.pageInfo}>
						Page {currentPage} of {totalPages} · {filtered.length} notes
					</span>
					<div className={styles.pageButtons}>
						<button
							className={styles.pageBtn}
							disabled={currentPage === 1}
							onClick={() => setPage((p) => p - 1)}
						>
							<ChevronLeft size={15} />
						</button>
						{Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
							<button
								key={p}
								className={`${styles.pageBtn} ${p === currentPage ? styles.pageBtnActive : ""}`}
								onClick={() => setPage(p)}
							>
								{p}
							</button>
						))}
						<button
							className={styles.pageBtn}
							disabled={currentPage === totalPages}
							onClick={() => setPage((p) => p + 1)}
						>
							<ChevronRight size={15} />
						</button>
					</div>
				</div>
			)}
		</div>
	);
}
