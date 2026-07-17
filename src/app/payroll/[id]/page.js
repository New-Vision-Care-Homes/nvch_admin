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
// ============================================================

import { useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import {
    Undo2, Building2,
    FileSpreadsheet, Clock, Download, Loader2, AlertTriangle,
} from "lucide-react";
import PageLayout    from "@components/layout/PageLayout";
import ErrorState    from "@components/UI/ErrorState";
import ActionMessage from "@components/UI/ActionMessage";
import styles        from "./payroll_detail.module.css";
import tableStyles   from "../payroll.module.css";
import { useCoverSheet, usePayrollExceptions } from "@/hooks/usePayroll";
import SummaryTable from "../_components/SummaryTable";
import DailyTable   from "../_components/DailyTable";
import {
    HOME_TYPE_COLORS,
    REGION_COLORS,
    COLOR_FALLBACK,
} from "@/utils/dropdown_list";
import { exportCoverSheetToExcel }  from "./_utils/exportCoverSheet";
import { exportPayrollHoursToExcel } from "./_utils/exportPayrollHours";
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

/**
 * Placeholder payroll status displayed in the period strip.
 * The className maps to a CSS module class (e.g. .statusPending)
 * that applies the appropriate pill colour.
 *
 * TODO: Replace with a real status field from the cover-sheet API.
 */
const PAYROLL_STATUS = {
    label:     "Pending Review",
    className: "statusPending",
};

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


    // ── Local state ───────────────────────────────────────────────────────────
    // activeTab controls which table is shown and which API variant is
    // requested. Switching to "daily" appends { detail: "daily" } to the
    // cover-sheet query, fetching per-day hour breakdowns.
    const [activeTab,    setActiveTab]    = useState("summary");
    // isExporting prevents double-clicks and shows a spinner on the Export button.
    const [isExporting,  setIsExporting]  = useState(false);


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
    console.log(coverSheet);

    // Convenience aliases into the cover-sheet response.
    const home         = coverSheet?.home  ?? null;
    const displayStaff = coverSheet?.staff ?? [];


    // ── Export handler ────────────────────────────────────────────────────────
    /**
     * Triggers an Excel download for the active tab.
     *   "summary" → exportCoverSheetToExcel  (SummaryTable columns)
     *   "daily"   → exportPayrollHoursToExcel (per-day columns)
     *
     * The exported file is always read-only — the sheet is password-locked
     * inside the export utility so recipients cannot edit the payroll data.
     *
     * Side effects: sets isExporting to true while the async export runs,
     *               then resets it so the button becomes clickable again.
     */
    const handleExport = async () => {
        if (!coverSheet || isExporting) return;
        setIsExporting(true);
        try {
            const params = {
                homeName:     coverSheet.home?.name,
                payYear:      Number(payYear),
                periodNumber: Number(periodNumber),
                periodStart:  coverSheet.payPeriod?.periodStart,
                periodEnd:    coverSheet.payPeriod?.periodEnd,
                staff:        displayStaff,
                logoUrl:      logoImg.src,
            };
            if (activeTab === "daily") {
                await exportPayrollHoursToExcel(params);
            } else {
                await exportCoverSheetToExcel(params);
            }
        } finally {
            setIsExporting(false);
        }
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
                    <div><h1>Payroll</h1></div>
                    <div className={styles.headerActions}>
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

                {!isLoading && !fetchError && (
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
                            </h1>
                            <div className={styles.homeCardMeta}>
                                {home?.homeType && (
                                    <span
                                        className={styles.homeCardPill}
                                        style={{ background: typeColor.bg, color: typeColor.text, borderColor: typeColor.border }}
                                    >
                                        {home.homeType}
                                    </span>
                                )}
                                {home?.region && (
                                    <span
                                        className={styles.homeCardPill}
                                        style={{ background: regionColor.bg, color: regionColor.text, borderColor: regionColor.border }}
                                    >
                                        {home.region}
                                    </span>
                                )}
                            </div>
                        </div>
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
                        <span className={styles.periodItemLabel}>Payroll Status</span>
                        <span className={`${styles.statusPill} ${styles[PAYROLL_STATUS.className]}`}>
                            {PAYROLL_STATUS.label}
                        </span>
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

                {/* ── Export button ─────────────────────────────────────────── */}
                {/* Sits below the tab strip; disabled while loading or if no data yet. */}
                <div className={styles.exportBtnRow}>
                    <Button
                        variant="excel"
                        size="sm"
                        icon={isExporting ? <Loader2 size={14} className={tableStyles.spin} /> : <Download size={14} />}
                        onClick={handleExport}
                        disabled={isExporting || isLoading || !coverSheet || displayStaff.length === 0 || exceptionCount > 0}
                    >
                        {activeTab === "daily" ? "Export Payroll Hour" : "Export Payroll Cover Sheet"}
                    </Button>
                </div>

                {/* ── Table area ───────────────────────────────────────────── */}
                {/* Delegates entirely to renderTable() — see that function for logic. */}
                {renderTable()}

            </div>
        </PageLayout>
    );
}
