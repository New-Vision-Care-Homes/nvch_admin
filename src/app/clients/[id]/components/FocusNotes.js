"use client";

import React, { useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useFocusNotes } from "@/hooks/useFocusNotes";
import { utcToFullDisplay } from "@/utils/timeHandling";
import ErrorState from "@components/UI/ErrorState";
import { Table2, Table2Pagination } from "@components/UI/Table";
import { FileText, Download, Search, ExternalLink } from "lucide-react";
import styles from "./FocusNotes.module.css";


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

	// ── Filter + search state
	const [search, setSearch] = useState("");
	const [roleFilter, setRoleFilter] = useState("all");
	const [statusFilter, setStatusFilter] = useState("all");
	const [page, setPage] = useState(1);

	// Build query parameters to send to the backend
	const queryParams = useMemo(() => {
		const params = { page, limit: PAGE_SIZE };
		// Pass filters only if they are being used
		if (search) params.search = search;
		if (roleFilter !== "all") params.role = roleFilter;
		if (statusFilter !== "all") params.status = statusFilter;
		return params;
	}, [page, search, roleFilter, statusFilter]);

	// Fetch data from the backend using the dynamic query parameters
	const {
		focusNotesOfClient,
		pagination,
		isFocusNotesOfClientLoading,
		fetchError
	} = useFocusNotes(id, queryParams);

	const pageNotes = focusNotesOfClient ?? [];

	// Extract pagination info from the backend response, falling back to defaults
	const currentPage = pagination?.currentPage || page;
	const totalPages = pagination?.totalPages || 1;
	const totalItems = pagination?.totalItems || pageNotes.length;

	// When filters change, reset to page 1
	const handleSearchChange = (e) => { setSearch(e.target.value); setPage(1); };
	const handleRoleChange = (e) => { setRoleFilter(e.target.value); setPage(1); };
	const handleStatusChange = (e) => { setStatusFilter(e.target.value); setPage(1); };

	if (isFocusNotesOfClientLoading || fetchError) {
		return <ErrorState isLoading={isFocusNotesOfClientLoading} errorMessage={fetchError} />;
	}

	// ── Table Configuration ────────────────────────────────────────────────

	const tableColumns = [
		{
			label: "Date",
			className: styles.tdDate,
			render: (note) => note.createdAt ? utcToFullDisplay(note.createdAt, TZ) : "—"
		},
		{
			label: "Created By",
			className: styles.tdAuthor,
			render: (note) => personName(note.createdBy)
		},
		{
			label: "Role",
			render: (note) => (
				<span className={`${styles.roleBadge} ${ROLE_CLASS[note.createdByRole] || styles.roleDefault}`}>
					{note.createdByRole || "—"}
				</span>
			)
		},
		{
			label: "Shift Window",
			className: styles.tdShift,
			render: (note) => {
				const start = note.shift?.startTime ? utcToFullDisplay(note.shift.startTime, TZ) : "—";
				const end = note.shift?.endTime ? utcToFullDisplay(note.shift.endTime, TZ) : "—";
				return (
					<>
						<span className={styles.shiftTime}>{start}</span>
						<span className={styles.shiftArrow}>→</span>
						<span className={styles.shiftTime}>{end}</span>
					</>
				);
			}
		},
		{
			label: "Shift Status",
			render: (note) => {
				const status = note.shift?.status;
				if (!status) return <span className={styles.cellEmpty}>—</span>;
				return (
					<span className={`${styles.statusBadge} ${STATUS_CLASS[status] || ""}`}>
						{status.replace(/_/g, " ")}
					</span>
				);
			}
		},
		{ label: "Opportunities / Concerns", className: styles.tdNote, render: (note) => truncate(note.opportunitiesConcerns) },
		{ label: "Successes", className: styles.tdNote, render: (note) => truncate(note.successes) },
		{ label: "General Notes", className: styles.tdNote, render: (note) => truncate(note.generalNotes) },
		{
			label: "Last Edited By",
			className: styles.tdAuthor,
			render: (note) => {
				if (!note.updatedBy) return <span className={styles.cellEmpty}>—</span>;
				return (
					<>
						{personName(note.updatedBy)}
						{note.updatedByRole && <span className={styles.updatedRole}> ({note.updatedByRole})</span>}
					</>
				);
			}
		},
		{
			label: "",
			className: styles.tdAction,
			headerClassName: styles.tdAction,
			render: (note) => (
				<button
					className={styles.actionBtn}
					title="View focus note detail"
					onClick={() => router.push(`/focus_notes/${note._id}`)}
				>
					<ExternalLink size={14} />
				</button>
			)
		}
	];

	return (
		<div className={styles.root}>

			{/* ── Toolbar ─────────────────────────────────────────── */}
			<div className={styles.toolbar}>
				<div className={styles.toolbarLeft}>
					<FileText size={16} className={styles.toolbarIcon} />
					<span className={styles.toolbarTitle}>Focus Notes</span>
					<span className={styles.countBadge}>{totalItems}</span>
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
			<Table2
				columns={tableColumns}
				data={pageNotes}
				emptyMessage="No focus notes match your filters."
				emptyIcon={<FileText size={28} />}
			/>

			{/* ── Pagination ──────────────────────────────────────── */}
			<Table2Pagination
				currentPage={currentPage}
				totalPages={totalPages}
				totalItems={totalItems}
				itemLabel="notes"
				onPageChange={setPage}
			/>
		</div>
	);
}
