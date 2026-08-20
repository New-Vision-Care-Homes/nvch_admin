"use client";

// ============================================================
// IMPORTS
// ------------------------------------------------------------
// Purpose:
//   Pull in all external libraries, UI components, hooks, and
//   utilities this page depends on.
//
// Relationship:
//   - PageLayout / ErrorState / ActionMessage are shared UI
//     shell and feedback components.
//   - useCoverSheet is the single data fetch for this page.
//     It returns home info, pay period, staff list, and totals
//     all in one response — no separate home fetch needed.
//   - SummaryTable and DailyTable render the two tab views.
//   - HOME_TYPE_COLORS / REGION_COLORS provide colour tokens
//     for the home type and region pills in the home card.
//   - exportPayrollWorkbook (src/utils/excelExport/) builds the
//     combined 3-tab Cover Sheet + Hour Sheet + Schedule package
//     downloaded by the single "Export Payroll Package" button.
// ============================================================

import { useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import {
    Undo2, Building2,
    FileSpreadsheet, Clock, Download, Loader2, AlertTriangle, History,
} from "lucide-react";
import PageLayout    from "@components/layout/PageLayout";
import ErrorState    from "@components/UI/ErrorState";
import ActionMessage from "@components/UI/ActionMessage";
import styles        from "./payroll_detail.module.css";
import tableStyles   from "../payroll.module.css";
import { useCoverSheet, usePayrollExceptions, useHouseReview, useUpdateSupervisorReview, useUpdatePayrollStatus } from "@/hooks/usePayroll";
import { useShifts } from "@/hooks/useShifts";
import { useProfile } from "@/hooks/useProfile";
import SummaryTable from "../_components/SummaryTable";
import DailyTable   from "../_components/DailyTable";
import StatusBadge, { ColorPill } from "@components/UI/Badge";
import { HOME_TYPE_COLORS } from "@/utils/dropdownList/homeType";
import { REGION_COLORS } from "@/utils/dropdownList/region";
import { COLOR_FALLBACK } from "@/utils/dropdownList/shared";
import { exportPayrollWorkbook } from "@/utils/excelExport/payrollWorkbook";
import Button   from "@components/UI/Button";
import logoImg  from "@/assets/logo/nv.png";


// ============================================================
// SECTION: Constants
// ------------------------------------------------------------
// Purpose:
//   Static configuration objects used to drive the page's
//   status pill and tab bar. Defined at module scope to avoid
//   recreating them on every render.
//
// Relationship:
//   - PAYROLL_STATUS is rendered in the period strip.
//     Replace with a real API field once the backend provides one.
//   - TABS drives the tab bar and controls which table component
//     (SummaryTable vs DailyTable) is rendered.
// ============================================================

const SUPERVISOR_TONE  = { pending: "warning", reviewed:  "success" };
const PAYROLL_TONE     = { pending: "neutral", processing: "info",  processed: "success" };
const SUPERVISOR_LABEL = { pending: "Pending", reviewed:  "Reviewed" };
const PAYROLL_LABEL    = { pending: "Pending", processing: "Processing", processed: "Processed" };

/**
 * Tab configuration for the two views on this page.
 *   - "summary" → Payroll Cover Sheet (SummaryTable)
 *   - "daily"   → Payroll Hours (DailyTable)
 *
 * The "daily" tab requires { detail: "daily" } to be added to
 * the cover-sheet query params, which triggers a different
 * API response that includes per-day hour breakdowns.
 */
const TABS = [
    { id: "summary", label: "Payroll Cover Sheet", Icon: FileSpreadsheet },
    { id: "daily",   label: "Payroll Hours",       Icon: Clock },
];


// ============================================================
// SECTION: Page Component — PayrollDetailPage
// ------------------------------------------------------------
// Purpose:
//   Per-home payroll detail view. Shows a home info card,
//   a period + status strip, and a tabbed interface with
//   two views: a cover-sheet summary table and a daily hours
//   breakdown table.
//
// Relationship:
//   - Reached from PayrollOverviewPage via /payroll/[id].
//   - homeId comes from the URL segment; payYear and
//     periodNumber come from query params set by the overview.
//   - All page data (home info + staff + totals) comes from a
//     single useCoverSheet call
//   - Passes the active tab flag to useCoverSheet so the correct
//     API variant (summary vs daily) is requested.
//   - SummaryTable and DailyTable consume coverSheet.staff.
//
// Flow:
//   URL params parsed (homeId, payYear, periodNumber)
//        ↓
//   useCoverSheet({ homeId, payYear, periodNumber, detail? })
//        → { home, payPeriod, staff, totals }
//        ↓
//   home info card ← coverSheet.home
//   displayStaff   ← coverSheet.staff
//        ↓
//   renderTable() picks SummaryTable or DailyTable
//   based on activeTab, loading state, and error state
// ============================================================

export default function PayrollDetailPage() {

    // ── Route params & URL search params ─────────────────────────────────────
    // homeId is the dynamic segment from the URL path (/payroll/[id]).
    // payYear and periodNumber are passed as query params from the overview
    // page so this page fetches the exact same period the user was viewing.
    const { id: homeId } = useParams();
    const searchParams   = useSearchParams();
    const router         = useRouter();

    const payYear      = searchParams.get("payYear")      || "";
    const periodNumber = searchParams.get("periodNumber") || "";

    const isCommunityRow = homeId === "community";


    // ── Local state ───────────────────────────────────────────────────────────
    // activeTab controls which table is shown and which API variant is
    // requested. Switching to "daily" appends { detail: "daily" } to the
    // cover-sheet query, fetching per-day hour breakdowns.
    const [activeTab,    setActiveTab]    = useState("summary");
    // isExporting prevents double-clicks and shows a spinner on the Export button.
    const [isExporting,  setIsExporting]  = useState(false);

    const [supervisorModalOpen, setSupervisorModalOpen] = useState(false);
    const [supervisorNote,      setSupervisorNote]      = useState("");
    const [payrollModalOpen,    setPayrollModalOpen]    = useState(false);
    const [payrollNextStatus,   setPayrollNextStatus]   = useState("");
    const [payrollNote,         setPayrollNote]         = useState("");


    // ── Data: Exceptions ─────────────────────────────────────────────────────
    // Fetched alongside the cover sheet so the banner can reflect the current
    // exception count without a separate user-triggered request.
    const {
        totalCount: exceptionCount,
        isLoading:  exceptionsLoading,
    } = usePayrollExceptions({
        params: {
            homeId,
            payYear:      payYear      ? Number(payYear)      : undefined,
            periodNumber: periodNumber ? Number(periodNumber) : undefined,
        },
        enabled: !!(homeId && payYear && periodNumber),
    });


    // ── Data: Cover sheet ─────────────────────────────────────────────────────
    // Single fetch that returns everything this page needs:
    //   coverSheet.home      → home name, type, region (for the info card)
    //   coverSheet.payPeriod → period dates (available if needed)
    //   coverSheet.staff     → caregiver rows for the tables
    //   coverSheet.totals    → aggregated totals
    //
    // When activeTab === "daily", { detail: "daily" } is appended so the
    // API populates each staff member's `daily` array with per-day hours.
    // The hook is disabled until all three required params are present
    // to avoid firing a partial request on initial render.
    const {
        coverSheet,
        isLoading,
        fetchError,
        refetch,
    } = useCoverSheet({
        params: {
            homeId,
            payYear:      payYear      ? Number(payYear)      : undefined,
            periodNumber: periodNumber ? Number(periodNumber) : undefined,
            ...(activeTab === "daily" ? { detail: "daily" } : {}),
        },
        enabled: !!(homeId && payYear && periodNumber),
    });

    // Convenience aliases into the cover-sheet response.
    const home         = coverSheet?.home  ?? null;
    const displayStaff = coverSheet?.staff ?? [];


    // ── Data: House review status ─────────────────────────────────────────────
    const { review } = useHouseReview({
        houseId:      homeId,
        payYear:      payYear      ? Number(payYear)      : undefined,
        periodNumber: periodNumber ? Number(periodNumber) : undefined,
        enabled:      !!(homeId && payYear && periodNumber),
    });

    const supervisorStatus = review?.supervisorStatus ?? "pending";
    const payrollStatus    = review?.payrollStatus    ?? "pending";

    const {
        updateSupervisorReview,
        isUpdating:  isUpdatingSupervisor,
        updateError: supervisorUpdateError,
        resetUpdate: resetSupervisor,
    } = useUpdateSupervisorReview();

    // "payroll" in the API error message should read "payroll admin" in the UI
    const supervisorDisplayError = supervisorUpdateError
        ? supervisorUpdateError.replace(/\bpayroll\b(?! admin)/gi, "payroll admin")
        : null;

    const {
        updatePayrollStatus: doUpdatePayrollStatus,
        isUpdating:  isUpdatingPayroll,
        updateError: payrollUpdateError,
        resetUpdate: resetPayroll,
    } = useUpdatePayrollStatus();

    const { profile } = useProfile();
    const canReviewSupervisor = profile?.permissionSlugs?.some((s) =>
        s === "review_assigned_house_hours" || s === "review_all_house_hours"
    ) ?? false;
    const canManagePayroll = profile?.permissionSlugs?.includes("manage_payroll") ?? false;
    const canViewReviewHistory = profile?.permissionSlugs?.some((s) =>
        s === "view_payroll" ||
        s === "review_assigned_house_hours" ||
        s === "review_all_house_hours"
    ) ?? false;


    // ── Data: Export package ─────────────────────────────────────────────────
    // The combined export always needs the daily-hours breakdown for the Hour
    // Sheet tab, regardless of which tab (summary/daily) the user currently
    // has open on screen — so this is a second, independent fetch (its own
    // query key, since { detail: "daily" } differs from the summary-tab
    // request above) rather than reusing/mutating the page's main data flow.
    const { coverSheet: exportCoverSheet } = useCoverSheet({
        params: {
            homeId,
            payYear:      payYear      ? Number(payYear)      : undefined,
            periodNumber: periodNumber ? Number(periodNumber) : undefined,
            detail:       "daily",
        },
        enabled: !!(homeId && payYear && periodNumber),
    });

    // Shifts for the Schedule tab, scoped to this home and the exact pay-period
    // date range — same { homeId, startDate, endDate } shape the Scheduling
    // calendar page uses for its own "Export Schedule" button.
    const exportPeriod = exportCoverSheet?.payPeriod;
    const { shifts: exportShifts } = useShifts({
        params: {
            homeId,
            startDate: exportPeriod ? format(new Date(exportPeriod.periodStart), "yyyy-MM-dd") : undefined,
            endDate:   exportPeriod ? format(new Date(exportPeriod.periodEnd),   "yyyy-MM-dd") : undefined,
        },
        enabled: !!(homeId && exportPeriod),
    });


    // ── Export handler ────────────────────────────────────────────────────────
    /**
     * Downloads the combined payroll package — one workbook, three tabs
     * (Cover Sheet, Hour Sheet, Schedule) — via exportPayrollWorkbook.
     *
     * The exported file is always read-only — every sheet is password-locked
     * inside the export utility so recipients cannot edit the payroll data.
     *
     * Side effects: sets isExporting to true while the async export runs,
     *               then resets it so the button becomes clickable again.
     */
    const handleExport = async () => {
        if (!exportCoverSheet || isExporting) return;
        setIsExporting(true);
        try {
            await exportPayrollWorkbook({
                homeName:     isCommunityRow ? "Other Hours" : exportCoverSheet.home?.name,
                homeId,
                payYear:      Number(payYear),
                periodNumber: Number(periodNumber),
                periodStart:  exportCoverSheet.payPeriod?.periodStart,
                periodEnd:    exportCoverSheet.payPeriod?.periodEnd,
                staff:        exportCoverSheet.staff ?? [],
                shifts:       exportShifts,
                logoUrl:      logoImg.src,
            });
        } finally {
            setIsExporting(false);
        }
    };

    // ── Modal handlers ────────────────────────────────────────────────────────

    const openSupervisorModal = () => {
        resetSupervisor();
        setSupervisorNote("");
        setSupervisorModalOpen(true);
    };

    const openPayrollModal = () => {
        resetPayroll();
        setPayrollNote("");
        const defaultNext = payrollStatus === "pending"
            ? "processing"
            : payrollStatus === "processing"
            ? "processed"
            : "pending";
        setPayrollNextStatus(defaultNext);
        setPayrollModalOpen(true);
    };

    const handleSupervisorSubmit = async (e) => {
        e.preventDefault();
        const newStatus = supervisorStatus === "pending" ? "reviewed" : "pending";
        try {
            await updateSupervisorReview({
                houseId: homeId,
                payYear: Number(payYear),
                periodNumber: Number(periodNumber),
                body: {
                    status: newStatus,
                    ...(supervisorNote.trim() ? { note: supervisorNote.trim() } : {}),
                },
            });
            setSupervisorModalOpen(false);
        } catch { /* surfaced via supervisorUpdateError */ }
    };

    const handlePayrollSubmit = async (e) => {
        e.preventDefault();
        try {
            await doUpdatePayrollStatus({
                houseId: homeId,
                payYear: Number(payYear),
                periodNumber: Number(periodNumber),
                body: {
                    status: payrollNextStatus,
                    ...(payrollNote.trim() ? { note: payrollNote.trim() } : {}),
                },
            });
            setPayrollModalOpen(false);
        } catch { /* surfaced via payrollUpdateError */ }
    };


    // ── Derived display values ────────────────────────────────────────────────
    // Colour tokens resolved from the home's type and region.
    // Used for the home card icon background and the type/region pills.
    const typeColor   = HOME_TYPE_COLORS[home?.homeType] || COLOR_FALLBACK;
    const regionColor = REGION_COLORS[home?.region]      || COLOR_FALLBACK;

    // Back-navigation URL. Preserves the selected year + period so the
    // overview page reopens on the same filter state.
    const backHref = `/payroll${payYear && periodNumber
        ? `?payYear=${payYear}&periodNumber=${periodNumber}`
        : ""}`;

    const hasExceptions = (exceptionCount ?? 0) > 0;

    const supervisorBtnDisabled = hasExceptions;
    const supervisorBtnTitle    = hasExceptions
        ? "Please clear all exceptions before changing the status"
        : undefined;

    const payrollBtnDisabled = supervisorStatus === "pending" || hasExceptions;
    const payrollBtnTitle    = hasExceptions
        ? "Please clear all exceptions before changing the status"
        : supervisorStatus === "pending"
        ? "Awaiting supervisor review"
        : undefined;

    const exportBtnTitle = supervisorStatus === "pending" ? "Awaiting supervisor review" : undefined;


    // ── Render helpers ────────────────────────────────────────────────────────

    /**
     * Decides what to render in the table area based on loading,
     * error, and data state.
     *
     * Priority order:
     *   1. Loading skeleton  — while the cover-sheet is fetching
     *   2. Error message     — if the fetch failed
     *   3. Empty state       — if the staff array is empty (no caregivers assigned)
     *   4. SummaryTable or DailyTable — based on the active tab
     *
     * @returns {JSX.Element}
     */
    const renderTable = () => {
        if (isLoading) {
            return (
                <div className={tableStyles.skeletonWrapper}>
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className={tableStyles.skeleton} />
                    ))}
                </div>
            );
        }

        if (fetchError) return <ActionMessage type="error" message={fetchError} />;

        if (!displayStaff.length) {
            return (
                <div className={styles.emptyState}>
                    <FileSpreadsheet size={36} className={styles.emptyStateIcon} />
                    <p className={styles.emptyStateTitle}>No staff found</p>
                    <p className={styles.emptyStateBody}>
                        No caregivers are assigned to this home
                    </p>
                </div>
            );
        }

        return activeTab === "daily"
            ? <DailyTable   staff={displayStaff} />
            : <SummaryTable staff={displayStaff} />;
    };


    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <PageLayout>
            <div>

                {/* ── Page header: title left, back button right ───────────── */}
                <div className={styles.pageHeader}>
                    <div><h1>{isCommunityRow ? "Other Hours" : "Payroll"}</h1></div>
                    <div className={styles.headerActions}>
                        {canViewReviewHistory && (
                            <Button
                                variant="secondary"
                                icon={<History size={15} />}
                                onClick={() => router.push(`/payroll/${homeId}/review-history?payYear=${payYear}&periodNumber=${periodNumber}`)}
                            >
                                Review History
                            </Button>
                        )}
                        <Button
                            variant="secondary"
                            icon={<Undo2 size={16} />}
                            onClick={() => router.push(backHref)}
                        >
                            Back
                        </Button>
                    </div>
                </div>

                {/* ── Home info card ───────────────────────────────────────── */}
                {/*
                    Home metadata (name, type, region) comes from coverSheet.home —
                    no separate fetch required. ErrorState covers the cover-sheet
                    loading + error state so the card is never rendered half-populated.
                    Note: coverSheet.home does not include an address field.
                */}
                <ErrorState isLoading={isLoading} errorMessage={fetchError} onRetry={refetch} />

                {!isLoading && !fetchError && !isCommunityRow && (
                    <div className={styles.homeCard}>
                        <div
                            className={styles.homeCardIcon}
                            style={{ background: typeColor.bg }}
                        >
                            <Building2 size={20} style={{ color: typeColor.border }} />
                        </div>
                        <div className={styles.homeCardBody}>
                            <h1 className={styles.homeCardName}>
                                {home?.name ?? "—"}
                                {review?.isOverdue && (
                                    <span className={styles.overdueBadge}>
                                        <StatusBadge label="Review Overdue" tone="danger" size="tag" />
                                    </span>
                                )}
                            </h1>
                            <div className={styles.homeCardMeta}>
                                {home?.homeType && <ColorPill label={home.homeType} color={typeColor} />}
                                {home?.region && <ColorPill label={home.region} color={regionColor} />}
                            </div>
                        </div>
                        <Button
                            className={styles.homeCardExportBtn}
                            variant="excel"
                            icon={isExporting ? <Loader2 size={15} className={tableStyles.spin} /> : <Download size={15} />}
                            onClick={handleExport}
                            disabled={isExporting || isLoading || !coverSheet || displayStaff.length === 0 || exceptionCount > 0 || supervisorStatus === "pending"}
                            title={exportBtnTitle}
                        >
                            {isExporting ? "Exporting…" : "Export Payroll Package"}
                        </Button>
                    </div>
                )}

                {!isLoading && !fetchError && isCommunityRow && (
                    <div className={styles.homeCard}>
                        <div className={styles.homeCardIcon} style={{ background: "#f1f5f9" }}>
                            <Building2 size={20} style={{ color: "#94a3b8" }} />
                        </div>
                        <div className={styles.homeCardBody}>
                            <h1 className={styles.homeCardName}>Other Hours</h1>
                            <p style={{ margin: 0, fontSize: "0.82rem", color: "#94a3b8" }}>
                                Hours not assigned to any specific home this period.
                            </p>
                        </div>
                        <Button
                            className={styles.homeCardExportBtn}
                            variant="excel"
                            icon={isExporting ? <Loader2 size={15} className={tableStyles.spin} /> : <Download size={15} />}
                            onClick={handleExport}
                            disabled={isExporting || isLoading || !coverSheet || displayStaff.length === 0 || exceptionCount > 0 || supervisorStatus === "pending"}
                            title={exportBtnTitle}
                        >
                            {isExporting ? "Exporting…" : "Export Payroll Package"}
                        </Button>
                    </div>
                )}

                {/* ── Period + status strip ────────────────────────────────── */}
                {/*
                    Displays the selected pay year, period number, and payroll
                    status side-by-side. payYear and periodNumber come from the
                    URL query params set by the overview page.
                */}
                <div className={styles.periodStrip}>
                    <div className={styles.periodItem}>
                        <span className={styles.periodItemLabel}>Pay Year</span>
                        <span className={styles.periodItemValue}>{payYear || "—"}</span>
                    </div>
                    <div className={styles.periodItem}>
                        <span className={styles.periodItemLabel}>Pay Period</span>
                        <span className={styles.periodItemValue}>
                            {periodNumber ? periodNumber : "—"}
                        </span>
                    </div>
                    <div className={styles.periodItem}>
                        <span className={styles.periodItemLabel}>Supervisor Review</span>
                        <div className={styles.periodItemRow}>
                            <StatusBadge
                                label={SUPERVISOR_LABEL[supervisorStatus] ?? supervisorStatus}
                                tone={SUPERVISOR_TONE[supervisorStatus]   ?? "neutral"}
                                size="tag"
                            />
                            {canReviewSupervisor && (
                                <Button
                                    variant="soft"
                                    size="sm"
                                    onClick={openSupervisorModal}
                                    disabled={supervisorBtnDisabled}
                                    title={supervisorBtnTitle}
                                >
                                    {supervisorStatus === "pending" ? "Mark as Reviewed" : "Revert to Pending"}
                                </Button>
                            )}
                        </div>
                    </div>
                    <div className={styles.periodItem}>
                        <span className={styles.periodItemLabel}>Payroll Status</span>
                        <div className={styles.periodItemRow}>
                            <StatusBadge
                                label={PAYROLL_LABEL[payrollStatus] ?? payrollStatus}
                                tone={PAYROLL_TONE[payrollStatus]   ?? "neutral"}
                                size="tag"
                            />
                            {canManagePayroll && (
                                <Button
                                    variant="soft"
                                    size="sm"
                                    onClick={openPayrollModal}
                                    disabled={payrollBtnDisabled}
                                    title={payrollBtnTitle}
                                >
                                    Update Status
                                </Button>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── Exception banner ─────────────────────────────────────── */}
                {/* Shown when exceptions exist; clicking navigates to the exceptions page */}
                {!exceptionsLoading && exceptionCount > 0 && (
                    <button
                        className={styles.exceptionBanner}
                        onClick={() => router.push(`/payroll/${homeId}/exceptions?payYear=${payYear}&periodNumber=${periodNumber}`)}
                    >
                        <AlertTriangle size={15} className={styles.exceptionBannerIcon} />
                        <span className={styles.exceptionBannerText}>
                            {exceptionCount} payroll exception{exceptionCount !== 1 ? "s" : ""} require attention before export.
                        </span>
                        <span className={styles.exceptionBannerCta}>View Exceptions →</span>
                    </button>
                )}

                {/* ── Tab bar ──────────────────────────────────────────────── */}
                {/*
                    Switching tabs updates activeTab state, which re-triggers
                    useCoverSheet with or without { detail: "daily" } so the
                    correct data is fetched for the active view.
                */}
                <div className={styles.tabs}>
                    {TABS.map(({ id, label, Icon }) => (
                        <button
                            key={id}
                            className={`${styles.tab} ${activeTab === id ? styles.tabActive : ""}`}
                            onClick={() => setActiveTab(id)}
                        >
                            <Icon size={15} />
                            {label}
                        </button>
                    ))}
                </div>

                {/* ── Table area ───────────────────────────────────────────── */}
                {/* Delegates entirely to renderTable() — see that function for logic. */}
                {renderTable()}

            </div>

            {/* ── Supervisor Review Modal ──────────────────────────────────── */}
            {supervisorModalOpen && (
                <div className={styles.modalOverlay} onClick={() => setSupervisorModalOpen(false)}>
                    <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h2 className={styles.modalTitle}>
                                {supervisorStatus === "pending" ? "Mark as Reviewed" : "Revert to Pending"}
                            </h2>
                        </div>
                        {supervisorDisplayError && (
                            <ActionMessage variant="error" message={supervisorDisplayError} />
                        )}
                        <form onSubmit={handleSupervisorSubmit}>
                            <label className={styles.modalLabel}>Note (optional)</label>
                            <textarea
                                className={styles.modalTextarea}
                                value={supervisorNote}
                                onChange={(e) => setSupervisorNote(e.target.value)}
                                placeholder="Add a note…"
                                rows={3}
                            />
                            <div className={styles.modalActions}>
                                <button type="button" className={styles.modalCancelBtn} onClick={() => setSupervisorModalOpen(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className={styles.modalSubmitBtn} disabled={isUpdatingSupervisor}>
                                    {isUpdatingSupervisor ? "Saving…" : supervisorStatus === "pending" ? "Mark as Reviewed" : "Revert to Pending"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── Payroll Status Modal ─────────────────────────────────────── */}
            {payrollModalOpen && (
                <div className={styles.modalOverlay} onClick={() => setPayrollModalOpen(false)}>
                    <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h2 className={styles.modalTitle}>Update Payroll Status</h2>
                        </div>
                        {payrollUpdateError && (
                            <ActionMessage variant="error" message={payrollUpdateError} />
                        )}
                        <form onSubmit={handlePayrollSubmit}>
                            <label className={styles.modalLabel}>New Status</label>
                            <select
                                className={styles.modalSelect}
                                value={payrollNextStatus}
                                onChange={(e) => setPayrollNextStatus(e.target.value)}
                                required
                            >
                                {["pending", "processing", "processed"]
                                    .filter((s) => s !== payrollStatus)
                                    .map((s) => (
                                        <option key={s} value={s}>{PAYROLL_LABEL[s]}</option>
                                    ))
                                }
                            </select>
                            <label className={styles.modalLabel}>
                                Note
                                {payrollStatus === "processed"
                                    ? <span className={styles.modalRequired}> * required when reverting</span>
                                    : <span> (optional)</span>
                                }
                            </label>
                            <textarea
                                className={styles.modalTextarea}
                                value={payrollNote}
                                onChange={(e) => setPayrollNote(e.target.value)}
                                placeholder={payrollStatus === "processed"
                                    ? "Why are you reverting from Processed?"
                                    : "Add a note…"
                                }
                                maxLength={1000}
                                rows={3}
                            />
                            <div className={styles.modalActions}>
                                <button type="button" className={styles.modalCancelBtn} onClick={() => setPayrollModalOpen(false)}>
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className={styles.modalSubmitBtn}
                                    disabled={
                                        isUpdatingPayroll ||
                                        !payrollNextStatus ||
                                        (payrollStatus === "processed" && !payrollNote.trim())
                                    }
                                >
                                    {isUpdatingPayroll ? "Saving…" : "Update Status"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </PageLayout>
    );
}
