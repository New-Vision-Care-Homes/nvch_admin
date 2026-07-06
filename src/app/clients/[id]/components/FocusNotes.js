"use client";

import React, { useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useFocusNotes } from "@/hooks/useFocusNotes";
import { utcToFullDisplay } from "@/utils/timeHandling";
import ErrorState from "@components/UI/ErrorState";
import { Table2, Table2Pagination } from "@components/UI/Table";
import { FileText, Download, ExternalLink, X } from "lucide-react";
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

	// ── Filter state
	const [startDate, setStartDate] = useState("");
	const [endDate, setEndDate] = useState("");
	const [page, setPage] = useState(1);

	// Build query parameters to send to the backend
	const queryParams = useMemo(() => {
		const params = { page, limit: PAGE_SIZE };
		if (startDate) params.startDate = startDate;
		if (endDate) params.endDate = endDate;
		return params;
	}, [page, startDate, endDate]);

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
	const handleStartDateChange = (e) => { setStartDate(e.target.value); setPage(1); };
	const handleEndDateChange = (e) => { setEndDate(e.target.value); setPage(1); };
	const handleClearDates = () => { setStartDate(""); setEndDate(""); setPage(1); };

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
					{/* Export buttons — hidden until export feature is implemented
					<button className={styles.exportBtn} disabled title="Coming soon">
						<Download size={13} />
						Export Excel
					</button>
					<button className={`${styles.exportBtn} ${styles.exportBtnPdf}`} disabled title="Coming soon">
						<Download size={13} />
						Export PDF
					</button>
					*/}
				</div>
			</div>

			{/* ── Filter bar ──────────────────────────────────────── */}
			<div className={styles.filterBar}>
				<div className={styles.dateRangeWrap}>
					<label className={styles.dateLabel}>From</label>
					<input
						type="date"
						className={styles.dateInput}
						value={startDate}
						onChange={handleStartDateChange}
					/>
				</div>
				<div className={styles.dateRangeWrap}>
					<label className={styles.dateLabel}>To</label>
					<input
						type="date"
						className={styles.dateInput}
						value={endDate}
						onChange={handleEndDateChange}
					/>
				</div>
				{(startDate || endDate) && (
					<button className={styles.clearBtn} onClick={handleClearDates}>
						<X size={13} />
						Clear
					</button>
				)}
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
