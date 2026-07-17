"use client";

// ============================================================
// IMPORTS
// ------------------------------------------------------------
// Purpose:
//   Pull in all external libraries, UI components, hooks, and
//   utilities this page depends on.
//
// Relationship:
//   - PageLayout / ErrorState are shared UI shell components.
//   - usePayPeriod provides the current pay period so the
//     filter can auto-populate on first load.
//   - usePayrollOverview fetches all homes + their payroll
//     totals concurrently and returns merged display rows.
//   - HOME_TYPE_COLORS / REGION_COLORS drive per-row pill
//     and accent colours throughout the table.
// ============================================================

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
    Building2, MapPin, Eye,
    AlertTriangle, CheckCircle2, Loader2, RefreshCw,
} from "lucide-react";
import PageLayout    from "@components/layout/PageLayout";
import ErrorState    from "@components/UI/ErrorState";
import ActionMessage from "@components/UI/ActionMessage";
import Button        from "@components/UI/Button";
import styles        from "./payroll.module.css";
import { usePayPeriod }                          from "@/hooks/usePayPeriods";
import { usePayrollOverview, useRecomputeStats } from "@/hooks/usePayroll";
import { useProfile }                            from "@/hooks/useProfile";
import {
    HOME_TYPE_COLORS,
    REGION_COLORS,
    COLOR_FALLBACK,
} from "@/utils/dropdown_list";


// ============================================================
// SECTION: Constants
// ------------------------------------------------------------
// Purpose:
//   Static lists used to populate the Pay Year and Pay Period
//   filter dropdowns. Defined at module scope so they are
//   created once, not on every render.
//
// Relationship:
//   Consumed by the filter bar inside PayrollOverviewPage.
// ============================================================

const CURRENT_YEAR   = new Date().getFullYear();

/** Show one year before and after the current year as selectable options. */
const YEAR_OPTIONS   = [CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1];

/** NovaCare uses 26 bi-weekly pay periods per year (1–26). */
const PERIOD_OPTIONS = Array.from({ length: 26 }, (_, i) => i + 1);


// ============================================================
// SECTION: Helpers
// ------------------------------------------------------------
// Purpose:
//   Pure utility functions used to format data for display.
//   Isolated here so they are easy to test and change without
//   touching rendering logic.
//
// Relationship:
//   Used in the overview table cells to format numeric totals.
// ============================================================

/**
 * Formats a numeric hour/dollar value to two decimal places.
 * Returns "—" for null or undefined values so empty cells look
 * intentional rather than broken.
 *
 * @param   {number|null|undefined} n
 * @returns {string}  e.g. "84.00" or "—"
 */
function fmt(n) {
    if (n == null) return "—";
    return Number(n).toFixed(2);
}


// ============================================================
// SECTION: Sub-components
// ------------------------------------------------------------
// Purpose:
//   Small, focused components that render a single cell or
//   UI element. Extracted here to keep the main table JSX
//   readable and to encapsulate their own conditional logic.
//
// Relationship:
//   Rendered inside the overview table row for each home.
//   Depends on the per-row { unresolvedHours, isLoading }
//   values returned by usePayrollOverview.
// ============================================================

/**
 * Renders the "Unresolved Hours" cell for one home row.
 *
 * Three states:
 *   1. isLoading  → spinning loader (payroll data still fetching)
 *   2. unresolvedHours > 0 → amber warning badge with hour count
 *   3. unresolvedHours === 0 → green "Resolved" badge
 *
 * @param {number|null} props.unresolvedHours  - From the payroll totals object.
 * @param {boolean}     props.isLoading        - True while the row's query is in flight.
 */
function UnresolvedBadge({ unresolvedHours, isLoading }) {
    if (isLoading) {
        return <span className={styles.loadingDots}><Loader2 size={12} className={styles.spin} /></span>;
    }
    if (unresolvedHours == null) return <span>—</span>;
    if (unresolvedHours > 0) {
        return (
            <span className={styles.unresolvedBadge}>
                <AlertTriangle size={11} />
                {unresolvedHours}h
            </span>
        );
    }
    return (
        <span className={styles.resolvedBadge}>
            <CheckCircle2 size={11} />
            Resolved
        </span>
    );
}


// ============================================================
// SECTION: Page Component — PayrollOverviewPage
// ------------------------------------------------------------
// Purpose:
//   Bird's-eye view of payroll across all homes for a selected
//   pay year and period. Each row shows one home's aggregated
//   totals (regular hours, total hours, unresolved hours).
//   Clicking the eye icon drills into the per-home cover sheet.
//
// Relationship:
//   - Reads from usePayPeriod to auto-fill the current period.
//   - Reads from usePayrollOverview which internally calls
//     useHomes + one useQuery per home concurrently.
//   - Navigates to /payroll/[homeId] (PayrollDetailPage) on
//     row action.
//
// Flow:
//   Page mounts
//        ↓
//   usePayPeriod resolves → auto-fills year + period dropdowns
//        ↓
//   usePayrollOverview fires once year + period are set
//        ↓
//   One concurrent query per home fetches payroll totals
//        ↓
//   Table renders rows, each loading independently
//        ↓
//   User clicks eye → navigates to detail page with query params
// ============================================================

export default function PayrollOverviewPage() {

    // ── Router ───────────────────────────────────────────────────────────────
    // Used by handleView to push to the per-home detail URL.
    const router = useRouter();


    // ── State: Filter controls ────────────────────────────────────────────────
    // Controlled inputs for the Pay Year and Pay Period dropdowns.
    // Both start empty; they are populated either by the auto-fill effect
    // (see below) or by the user changing a dropdown.
    //
    // defaultsApplied prevents the auto-fill effect from overriding a
    // selection the user has already made after the initial load.
    const [selectedYear,    setSelectedYear]    = useState("");
    const [selectedPeriod,  setSelectedPeriod]  = useState("");
    const [defaultsApplied, setDefaultsApplied] = useState(false);


    // ── Data: Current pay period (for auto-fill) ──────────────────────────────
    // Fetches the pay period at offset 0 (i.e. the active period today).
    // Once resolved, the effect below copies its year + periodNumber into
    // the filter dropdowns so the page shows meaningful data immediately.
    const { payPeriod } = usePayPeriod(0);

    useEffect(() => {
        // Only run once; skip if the user has already interacted with the filters.
        if (payPeriod && !defaultsApplied) {
            setSelectedYear(String(payPeriod.payYear));
            setSelectedPeriod(String(payPeriod.periodNumber));
            setDefaultsApplied(true);
        }
    }, [payPeriod, defaultsApplied]);


    // ── Data: All homes + payroll totals ──────────────────────────────────────
    // usePayrollOverview handles everything: fetching the home list,
    // firing one query per home concurrently, and merging the results
    // into display-ready rows. The page only needs to render.
    //
    // Each row shape: { home, homeId, totals, isLoading, fetchError }
    // rows is always an array (empty until homes load).
    const {
        rows,
        homesLoading,
        homesError,
        refetchHomes,
    } = usePayrollOverview({
        payYear:      selectedYear,
        periodNumber: selectedPeriod,
        enabled:      !!(selectedYear && selectedPeriod),
    });

    // ── Data: recompute mutation ──────────────────────────────────────────────
    const {
        recompute,
        isRecomputing,
        recomputeResult,
        recomputeError,
        resetRecompute,
    } = useRecomputeStats();

    // ── Permissions ───────────────────────────────────────────────────────────
    const { profile } = useProfile();
    const canRecompute = profile?.permissionSlugs?.includes("manage_payroll") ?? false;


    // ── Event handlers ────────────────────────────────────────────────────────

    /**
     * Navigates to the per-home payroll detail page, carrying the
     * currently selected year and period as query params so the
     * detail page can pre-fetch the right cover sheet.
     *
     * @param {string} homeId - The home's database ID.
     */
    const handleView = (homeId) => {
        const qs = new URLSearchParams({
            payYear:      selectedYear,
            periodNumber: selectedPeriod,
        }).toString();
        router.push(`/payroll/${homeId}?${qs}`);
    };

    /** Force a stat recompute for the currently selected period. */
    const handleRecompute = async () => {
        if (!selectedYear || !selectedPeriod) return;
        try {
            await recompute({ payYear: Number(selectedYear), periodNumber: Number(selectedPeriod) });
        } catch (_) {
            // recomputeError is surfaced via the hook's state and shown in ActionMessage.
        }
    };


    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <PageLayout>
            <div className={styles.pageContainer}>

                {/* ── Page header ─────────────────────────────────────────── */}
                <div className={styles.pageHeader}>
                    <div><h1>Payroll Overview</h1></div>
                    {canRecompute && (
                        <Button
                            variant="primary"
                            icon={isRecomputing
                                ? <Loader2 size={14} className={styles.spin} />
                                : <RefreshCw size={14} />
                            }
                            onClick={handleRecompute}
                            disabled={isRecomputing || !selectedYear || !selectedPeriod}
                        >
                            {isRecomputing ? "Recomputing…" : "Recompute Stats"}
                        </Button>
                    )}
                </div>

                <div className={styles.overviewCard}>

                    {/* ── Recompute feedback ───────────────────────────────── */}
                    <ActionMessage
                        variant="success"
                        message={recomputeResult
                            ? `Recompute complete — ${recomputeResult.updated ?? 0} updated, ${recomputeResult.pruned ?? 0} pruned, ${recomputeResult.evaluated ?? 0} evaluated`
                            : null
                        }
                        onClose={resetRecompute}
                    />
                    <ActionMessage variant="error" message={recomputeError} />

                    {/* ── Filter bar ───────────────────────────────────────── */}
                    {/*
                        Left: dropdowns + home count badge.
                        Right: Recompute Stats button (manage_payroll only).
                    */}
                    <div className={styles.overviewFilterBar}>
                        <div className={styles.overviewFilterGroup}>
                            <label className={styles.overviewFilterLabel}>Pay Year</label>
                            <select
                                className={styles.overviewFilterSelect}
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(e.target.value)}
                            >
                                <option value="">Select year…</option>
                                {YEAR_OPTIONS.map((y) => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </select>
                        </div>

                        <div className={styles.overviewFilterGroup}>
                            <label className={styles.overviewFilterLabel}>Pay Period</label>
                            <select
                                className={styles.overviewFilterSelect}
                                value={selectedPeriod}
                                onChange={(e) => setSelectedPeriod(e.target.value)}
                            >
                                <option value="">Select period…</option>
                                {PERIOD_OPTIONS.map((p) => (
                                    <option key={p} value={p}>Period {p}</option>
                                ))}
                            </select>
                        </div>

                        {rows.length > 0 && (
                            <span className={styles.overviewCount}>{rows.length} homes</span>
                        )}
                    </div>

                    {/* ── Homes table ──────────────────────────────────────── */}
                    {/*
                        ErrorState covers the homes-list fetch (not per-row payroll fetches).
                        Per-row errors are handled inline in each row cell.
                        Columns: Home | Type | Region | Address | Regular Hrs |
                                 Total Hrs | Unresolved | Status | Actions
                    */}
                    <ErrorState isLoading={homesLoading} errorMessage={homesError} onRetry={refetchHomes} />

                    {!homesLoading && !homesError && (
                        <div className={styles.overviewTableWrap}>
                            <table className={styles.overviewTable}>
                                <thead>
                                    <tr>
                                        <th>Home</th>
                                        <th>Type</th>
                                        <th>Region</th>
                                        <th>Address</th>
                                        <th className={styles.overviewThNum}>Regular Hrs</th>
                                        <th className={styles.overviewThNum}>Total Hrs</th>
                                        <th>Unresolved</th>
                                        <th>Status</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map(({ home, homeId, totals, isLoading, fetchError }, idx) => {
                                        // Resolve colour tokens once per row to avoid repeating lookups in each cell.
                                        const typeColor   = HOME_TYPE_COLORS[home.homeType] || COLOR_FALLBACK;
                                        const regionColor = REGION_COLORS[home.region]       || COLOR_FALLBACK;
                                        return (
                                            <tr
                                                key={homeId}
                                                className={`${styles.overviewRow} ${idx % 2 !== 0 ? styles.overviewRowEven : ""}`}
                                            >
                                                {/* Home name — left accent border colour matches home type */}
                                                <td
                                                    className={styles.overviewHomeCell}
                                                    style={{ borderLeft: `4px solid ${typeColor.border}` }}
                                                >
                                                    <div className={styles.overviewHomeInner}>
                                                        <Building2 size={14} style={{ color: typeColor.border, flexShrink: 0 }} />
                                                        <span>{home.name}</span>
                                                    </div>
                                                </td>

                                                {/* Type pill */}
                                                <td>
                                                    {home.homeType ? (
                                                        <span
                                                            className={styles.overviewPill}
                                                            style={{ background: typeColor.bg, color: typeColor.text, borderColor: typeColor.border }}
                                                        >
                                                            {home.homeType}
                                                        </span>
                                                    ) : "—"}
                                                </td>

                                                {/* Region pill */}
                                                <td>
                                                    {home.region ? (
                                                        <span
                                                            className={styles.overviewPill}
                                                            style={{ background: regionColor.bg, color: regionColor.text, borderColor: regionColor.border }}
                                                        >
                                                            {home.region}
                                                        </span>
                                                    ) : "—"}
                                                </td>

                                                {/* Address */}
                                                <td className={styles.overviewAddressCell}>
                                                    {home.address ? (
                                                        <div className={styles.overviewAddressInner}>
                                                            <MapPin size={12} style={{ flexShrink: 0, opacity: 0.45 }} />
                                                            <span>{home.address.street}{home.address.city ? `, ${home.address.city}` : ""}</span>
                                                        </div>
                                                    ) : "—"}
                                                </td>

                                                {/* Regular hours — shows spinner while this home's query is in flight */}
                                                <td className={`${styles.overviewNumCell} ${isLoading ? styles.overviewCellLoading : ""}`}>
                                                    {isLoading
                                                        ? <Loader2 size={13} className={styles.spin} />
                                                        : fmt(totals?.regular)
                                                    }
                                                </td>

                                                {/* Total hours */}
                                                <td className={`${styles.overviewNumCell} ${styles.overviewTotalNum} ${isLoading ? styles.overviewCellLoading : ""}`}>
                                                    {isLoading
                                                        ? <Loader2 size={13} className={styles.spin} />
                                                        : fmt(totals?.totalHours)
                                                    }
                                                </td>

                                                {/* Unresolved hours badge */}
                                                <td>
                                                    <UnresolvedBadge
                                                        unresolvedHours={totals?.unresolvedHours ?? null}
                                                        isLoading={isLoading && !fetchError}
                                                    />
                                                </td>

                                                {/* Payroll status — placeholder until backend provides a status field */}
                                                <td>
                                                    <span className={styles.overviewStatusDash}>—</span>
                                                </td>

                                                {/* View action — navigates to detail page for this home */}
                                                <td className={styles.overviewActionsCell}>
                                                    <button
                                                        className={styles.overviewViewBtn}
                                                        onClick={() => handleView(homeId)}
                                                        title="View payroll details"
                                                        disabled={!selectedYear || !selectedPeriod}
                                                    >
                                                        <Eye size={15} />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}

                                    {rows.length === 0 && (
                                        <tr>
                                            <td colSpan={9} className={styles.overviewEmptyCell}>
                                                No homes found.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </PageLayout>
    );
}
