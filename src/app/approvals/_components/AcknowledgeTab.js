"use client";

import { useState, useEffect, useRef } from "react";
import { Search, X, Download, Loader2, Timer, User } from "lucide-react";
import Pagination from "@/components/UI/Pagination";
import EmptyState from "@/components/UI/EmptyState";
import Button from "@components/UI/Button";
import { useOvertimeAcknowledgments } from "@/hooks/useApprovals";
import { useCaregivers } from "@/hooks/useCaregivers";
import { exportAckWorkbook, exportSingleAckWorkbook } from "@/utils/excelExport/ackSheet";
import logoImg from "@/assets/logo/nv.png";
import AcknowledgmentRow from "./AcknowledgmentRow";
import { CURRENT_YEAR, YEAR_OPTIONS, PERIOD_OPTIONS } from "../_utils/approvalMeta";
import styles from "../approvals.module.css";

export default function AcknowledgeTab() {
	const [page,              setPage]              = useState(1);
	const [selectedStatus,    setSelectedStatus]    = useState("");
	const [selectedCaregiver, setSelectedCaregiver] = useState(null);
	const [caregiverInput,    setCaregiverInput]    = useState("");
	const [debouncedSearch,   setDebouncedSearch]   = useState("");
	const [showDropdown,      setShowDropdown]      = useState(false);
	const [filterMode,        setFilterMode]        = useState("none");
	const [payYear,           setPayYear]           = useState(String(CURRENT_YEAR));
	const [periodNumber,      setPeriodNumber]      = useState("");
	const [from,              setFrom]              = useState("");
	const [to,                setTo]                = useState("");
	const dropdownRef = useRef(null);

	// Debounce caregiver search input
	useEffect(() => {
		const timer = setTimeout(() => setDebouncedSearch(caregiverInput), 300);
		return () => clearTimeout(timer);
	}, [caregiverInput]);

	// Close dropdown on outside click
	useEffect(() => {
		const handler = (e) => {
			if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
				setShowDropdown(false);
			}
		};
		document.addEventListener("mousedown", handler);
		return () => document.removeEventListener("mousedown", handler);
	}, []);

	const { caregivers: caregiverResults, isCaregiverLoading: isCaregiverSearching } = useCaregivers({
		search:  debouncedSearch,
		limit:   8,
		enabled: debouncedSearch.length >= 2 && !selectedCaregiver,
	});

	// Reset to page 1 when any filter changes
	useEffect(() => { setPage(1); }, [selectedStatus, selectedCaregiver, filterMode, payYear, periodNumber, from, to]);

	// Build query params
	const queryParams = {
		page,
		limit: 20,
		...(selectedStatus    && { status:      selectedStatus }),
		...(selectedCaregiver && { caregiverId: selectedCaregiver.id }),
	};
	if (filterMode === "period" && payYear && periodNumber) {
		queryParams.payYear      = payYear;
		queryParams.periodNumber = periodNumber;
	} else if (filterMode === "date") {
		if (from) queryParams.from = from;
		if (to)   queryParams.to   = to;
	}

	const { acknowledgments, counts, pagination, isLoading, fetchError, fetchAllForExport } =
		useOvertimeAcknowledgments(queryParams);

	const [isExporting,    setIsExporting]    = useState(false);
	const [exportingRowId, setExportingRowId] = useState(null);
	const isAcknowledgedView = selectedStatus === "acknowledged";

	const handleExportAll = async () => {
		setIsExporting(true);
		try {
			const exportParams = {
				status: "acknowledged",
				...(selectedCaregiver && { caregiverId: selectedCaregiver.id }),
			};
			if (filterMode === "period" && payYear && periodNumber) {
				exportParams.payYear      = payYear;
				exportParams.periodNumber = periodNumber;
			} else if (filterMode === "date") {
				if (from) exportParams.from = from;
				if (to)   exportParams.to   = to;
			}
			const allAcks = await fetchAllForExport(exportParams);
			await exportAckWorkbook({
				acknowledgments: allAcks,
				logoUrl: logoImg.src,
				filters: { dateMode: filterMode, payYear, periodNumber, from, to },
			});
		} finally {
			setIsExporting(false);
		}
	};

	const handleRowExport = async (ack) => {
		setExportingRowId(ack.approvalId);
		try {
			await exportSingleAckWorkbook({ ack, logoUrl: logoImg.src });
		} finally {
			setExportingRowId(null);
		}
	};

	const STATUS_TABS = [
		{ value: "",             label: "All",          count: counts.total        },
		{ value: "acknowledged", label: "Acknowledged", count: counts.acknowledged },
		{ value: "pending",      label: "Pending",      count: counts.pending      },
		{ value: "declined",     label: "Declined",     count: counts.declined     },
		{ value: "cancelled",    label: "Cancelled",    count: counts.cancelled    },
	];

	const hasActiveFilters = !!selectedCaregiver || filterMode !== "none";

	const clearFilters = () => {
		setSelectedCaregiver(null);
		setCaregiverInput("");
		setDebouncedSearch("");
		setFilterMode("none");
		setFrom("");
		setTo("");
		setPeriodNumber("");
	};

	return (
		<div>
			{/* ── Status sub-tabs (+ Export All on Acknowledged tab) ─── */}
			<div className={styles.ackTabRow}>
				<div className={styles.tabs} style={{ marginBottom: 0, borderBottom: "1px solid #e5e7eb" }}>
					{STATUS_TABS.map((tab) => (
						<button
							key={tab.value}
							className={`${styles.tab} ${selectedStatus === tab.value ? styles.tabActive : ""}`}
							onClick={() => setSelectedStatus(tab.value)}
						>
							{tab.label}
							<span className={`${styles.tabBadge} ${selectedStatus === tab.value ? styles.tabBadgeActive : ""}`}>
								{tab.count}
							</span>
						</button>
					))}
				</div>
				{isAcknowledgedView && (
					<Button
						variant="excel"
						icon={isExporting
							? <Loader2 size={14} className={styles.ackExportSpinner} />
							: <Download size={14} />
						}
						onClick={handleExportAll}
						disabled={isExporting}
					>
						{isExporting ? "Exporting…" : "Export All"}
					</Button>
				)}
			</div>

			{/* ── Filter bar ──────────────────────────────────────────── */}
			<div className={styles.ackFilterBar}>

				{/* Caregiver search */}
				<div className={styles.ackSearchWrap} ref={dropdownRef}>
					{selectedCaregiver ? (
						<div className={styles.ackSelectedChip}>
							<User size={12} />
							<span>{selectedCaregiver.firstName} {selectedCaregiver.lastName}</span>
							<button
								className={styles.ackChipRemove}
								onClick={() => { setSelectedCaregiver(null); setCaregiverInput(""); }}
							>
								<X size={11} />
							</button>
						</div>
					) : (
						<>
							<div className={styles.ackSearchInputWrap}>
								<Search size={13} className={styles.ackSearchIcon} />
								<input
									className={styles.ackSearchInput}
									placeholder="Search caregiver…"
									value={caregiverInput}
									onChange={(e) => { setCaregiverInput(e.target.value); setShowDropdown(true); }}
									onFocus={() => caregiverInput.length >= 2 && setShowDropdown(true)}
								/>
							</div>
							{showDropdown && debouncedSearch.length >= 2 && (
								<div className={styles.ackDropdown}>
									{isCaregiverSearching && (
										<p className={styles.ackDropdownMsg}>Searching…</p>
									)}
									{!isCaregiverSearching && caregiverResults.length === 0 && (
										<p className={styles.ackDropdownMsg}>No caregivers found</p>
									)}
									{caregiverResults.map((cg) => (
										<button
											key={cg._id || cg.id}
											className={styles.ackDropdownItem}
											onMouseDown={(e) => e.preventDefault()}
											onClick={() => {
												setSelectedCaregiver({
													id:         cg._id || cg.id,
													firstName:  cg.firstName,
													lastName:   cg.lastName,
													employeeId: cg.employeeId,
												});
												setCaregiverInput("");
												setDebouncedSearch("");
												setShowDropdown(false);
											}}
										>
											<span className={styles.ackDropdownName}>
												{cg.firstName} {cg.lastName}
											</span>
											{cg.employeeId && (
												<span className={styles.ackDropdownId}>{cg.employeeId}</span>
											)}
										</button>
									))}
								</div>
							)}
						</>
					)}
				</div>

				{/* Date filter mode */}
				<select
					className={styles.ackFilterSelect}
					value={filterMode}
					onChange={(e) => setFilterMode(e.target.value)}
				>
					<option value="none">No date filter</option>
					<option value="period">Pay period</option>
					<option value="date">Date range</option>
				</select>

				{filterMode === "period" && (
					<>
						<select
							className={styles.ackFilterSelect}
							value={payYear}
							onChange={(e) => setPayYear(e.target.value)}
						>
							{YEAR_OPTIONS.map((y) => <option key={y} value={y}>{y}</option>)}
						</select>
						<select
							className={styles.ackFilterSelect}
							value={periodNumber}
							onChange={(e) => setPeriodNumber(e.target.value)}
						>
							<option value="">Period…</option>
							{PERIOD_OPTIONS.map((p) => (
								<option key={p} value={p}>Period {p}</option>
							))}
						</select>
					</>
				)}

				{filterMode === "date" && (
					<>
						<input
							type="date"
							className={styles.ackFilterSelect}
							value={from}
							onChange={(e) => setFrom(e.target.value)}
						/>
						<input
							type="date"
							className={styles.ackFilterSelect}
							value={to}
							onChange={(e) => setTo(e.target.value)}
						/>
					</>
				)}

				{hasActiveFilters && (
					<button className={styles.ackClearBtn} onClick={clearFilters}>
						<X size={12} />
						Clear
					</button>
				)}
			</div>

			{/* ── List ────────────────────────────────────────────────── */}
			{isLoading && (
				<div className={styles.skeletonList}>
					{[...Array(4)].map((_, i) => <div key={i} className={styles.skeleton} />)}
				</div>
			)}

			{!isLoading && fetchError && (
				<EmptyState title="Could not load acknowledgments" message={fetchError} />
			)}

			{!isLoading && !fetchError && acknowledgments.length === 0 && (
				<EmptyState
					title="No acknowledgments found"
					message="No overtime acknowledgments match your current filters."
					icon={<Timer size={32} color="#d97706" />}
				/>
			)}

			{!isLoading && !fetchError && acknowledgments.length > 0 && (
				<>
					<div className={styles.list}>
						{acknowledgments.map((ack) => (
							<AcknowledgmentRow
								key={ack.approvalId}
								ack={ack}
								onExport={() => handleRowExport(ack)}
								isExportingThis={exportingRowId === ack.approvalId}
							/>
						))}
					</div>
					<Pagination
						pageCount={pagination.pages}
						forcePage={page - 1}
						onPageChange={({ selected }) => setPage(selected + 1)}
					/>
				</>
			)}
		</div>
	);
}
