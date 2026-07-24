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
//   - useHomes provides the homes list to populate the Home
//     dropdown and auto-select the first home.
//   - useCoverSheet fetches the cover sheet for the selected
//     home + pay period, providing the per-caregiver staff rows.
// ============================================================

import { useState, useEffect, useMemo } from "react";
import { useRouter }    from "next/navigation";
import { Eye, Loader2 } from "lucide-react";
import PageLayout from "@components/layout/PageLayout";
import ErrorState from "@components/UI/ErrorState";
import { PageTable, PageTableRow, PageTableHeadCell, PageTableCell } from "@components/UI/Table";
import { useCoverSheet } from "@/hooks/usePayroll";
import { useHomes }      from "@/hooks/useHomes";
import { usePayPeriod }  from "@/hooks/usePayPeriods";
import styles from "../payroll.module.css";


// ============================================================
// SECTION: Constants
// ------------------------------------------------------------
// Purpose:
//   Static lists used to populate the Pay Year and Pay Period
//   filter dropdowns. Defined at module scope so they are
//   created once, not on every render.
//
// Relationship:
//   Consumed by the filter bar inside PayrollManualEntriesPage.
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
//
// Relationship:
//   Used in table cells to format numeric hour/dollar values.
// ============================================================

/**
 * Formats a numeric hour/dollar value to two decimal places.
 * Returns "—" for null or undefined so empty cells look intentional.
 *
 * @param   {number|null|undefined} value
 * @returns {string}  e.g. "84.00" or "—"
 */
function formatNumeric(value) {
    if (value == null) return "—";
    return Number(value).toFixed(2);
}


// ============================================================
// SECTION: Page Component — PayrollManualEntriesPage
// ------------------------------------------------------------
// Purpose:
//   Shows a per-caregiver manual entries view for a selected
//   home and pay period. Mirrors the cover-sheet column layout
//   (Regular, Other, Holiday, Training, etc.) so reviewers
//   can inspect individual staff rows and drill through to a
//   caregiver summary detail page.
//
// Relationship:
//   - Reads from usePayPeriod(0) to auto-fill year + period.
//   - Reads from useHomes to populate and default the home
//     dropdown to the first available home.
//   - Reads from useCoverSheet once all three filters are set.
//   - Navigates to /payroll/caregivers/[id] on the eye action.
//
// Flow:
//   Page mounts
//        ↓
//   usePayPeriod resolves → auto-fills year + period dropdowns
//   useHomes resolves     → auto-fills home dropdown (first home)
//        ↓
//   useCoverSheet fires once all three filters are set
//        ↓
//   Table renders one row per caregiver with hour/dollar totals
//        ↓
//   User clicks eye → navigates to caregiver summary detail page
// ============================================================

export default function PayrollManualEntriesPage() {

    // ── Router ───────────────────────────────────────────────────────────────
    const router = useRouter();


    // ── State: Filter controls ────────────────────────────────────────────────
    // Three controlled dropdowns: Home, Pay Year, Pay Period.
    // All start empty; populated by auto-fill effects or user interaction.
    //
    // defaultsApplied gates the pay-period auto-fill so it only runs once
    // and does not override a subsequent user selection.
    const [selectedHomeId,   setSelectedHomeId]   = useState("");
    const [selectedYear,     setSelectedYear]     = useState("");
    const [selectedPeriod,   setSelectedPeriod]   = useState("");
    const [defaultsApplied,  setDefaultsApplied]  = useState(false);


    // ── Data: Homes list ──────────────────────────────────────────────────────
    // Fetched immediately so the dropdown is populated as fast as possible.
    const {
        homes,
        isLoading: homesLoading,
        fetchError: homesError,
        refetch: refetchHomes,
    } = useHomes({ params: { limit: 100 } });


    // ── Data: Current pay period (for auto-fill) ──────────────────────────────
    // Fetches the period at offset 0 (the active period today).
    const { payPeriod } = usePayPeriod(0);


    // ── Effect: Auto-fill Pay Year + Pay Period ───────────────────────────────
    // Runs once after the current pay period resolves; skipped if the user has
    // already changed a filter (guarded by defaultsApplied).
    useEffect(() => {
        if (payPeriod && !defaultsApplied) {
            setSelectedYear(String(payPeriod.payYear));
            setSelectedPeriod(String(payPeriod.periodNumber));
            setDefaultsApplied(true);
        }
    }, [payPeriod, defaultsApplied]);


    // ── Effect: Auto-fill first home ─────────────────────────────────────────
    // Once the homes list arrives, default to the first home if the user has
    // not already selected one.
    useEffect(() => {
        if (homes.length > 0 && !selectedHomeId) {
            setSelectedHomeId(homes[0].id);
        }
    }, [homes, selectedHomeId]);


    // ── Data: Cover sheet ─────────────────────────────────────────────────────
    // Fires only when all three filters are set.
    // `staff` is the per-caregiver rows array from the cover sheet response.
    const {
        coverSheet,
        isLoading,
        fetchError,
        refetch,
    } = useCoverSheet({
        params: {
            homeId:       selectedHomeId,
            payYear:      Number(selectedYear)  || undefined,
            periodNumber: Number(selectedPeriod) || undefined,
        },
        enabled: !!(selectedHomeId && selectedYear && selectedPeriod),
    });

    const staff = coverSheet?.staff ?? [];


    // ── Column totals ─────────────────────────────────────────────────────────
    // Computed once whenever the staff array changes.
    // Used in the Totals footer row.
    const totals = useMemo(() => {
        const sumDollars = (key) => staff.reduce((acc, s) => acc + (s.dollars?.[key] ?? 0), 0);
        return {
            regularSalary: sumDollars("regular_salary"),
            retroBonus:    sumDollars("retro_bonus"),
            vacationPay:   sumDollars("vacation_pay"),
            holidayPay:    staff.reduce((acc, s) => acc + (s.hours?.stat_pay ?? 0), 0),
            totalHours:    staff.reduce((acc, s) => acc + (s.totalHours ?? 0), 0),
        };
    }, [staff]);


    // ── Event handlers ────────────────────────────────────────────────────────

    /**
     * Navigates to the caregiver payroll summary page, carrying the
     * currently selected year and period as query params.
     *
     * @param {string} caregiverId - The caregiver's database ID.
     */
    const handleViewCaregiver = (caregiverId) => {
        router.push(
            `/payroll/caregivers/${caregiverId}?payYear=${selectedYear}&periodNumber=${selectedPeriod}`
        );
    };

    const filtersComplete = !!(selectedHomeId && selectedYear && selectedPeriod);


    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <PageLayout>
            <div className={styles.pageContainer}>

                {/* ── Page header ─────────────────────────────────────────── */}
                <div className={styles.pageHeader}>
                    <div><h1>Payroll Manual Entries</h1></div>
                </div>

                <div className={styles.overviewCard}>

                    {/* ── Filter bar ───────────────────────────────────────── */}
                    {/*
                        Three groups: Home, Pay Year, Pay Period.
                        Homes dropdown is disabled while the list is loading.
                    */}
                    <div className={styles.overviewFilterBar}>

                        {/* Home */}
                        <div className={styles.overviewFilterGroup}>
                            <label className={styles.overviewFilterLabel}>
                                Home
                                {homesLoading && (
                                    <Loader2
                                        size={10}
                                        className={styles.spin}
                                        style={{ marginLeft: 5 }}
                                    />
                                )}
                            </label>
                            <select
                                className={styles.overviewFilterSelect}
                                value={selectedHomeId}
                                onChange={(e) => setSelectedHomeId(e.target.value)}
                                disabled={homesLoading}
                            >
                                <option value="">Select home…</option>
                                {homes.map((home) => (
                                    <option key={home.id} value={home.id}>
                                        {home.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Pay Year */}
                        <div className={styles.overviewFilterGroup}>
                            <label className={styles.overviewFilterLabel}>Pay Year</label>
                            <select
                                className={styles.overviewFilterSelect}
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(e.target.value)}
                            >
                                <option value="">Select year…</option>
                                {YEAR_OPTIONS.map((year) => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                            </select>
                        </div>

                        {/* Pay Period */}
                        <div className={styles.overviewFilterGroup}>
                            <label className={styles.overviewFilterLabel}>Pay Period</label>
                            <select
                                className={styles.overviewFilterSelect}
                                value={selectedPeriod}
                                onChange={(e) => setSelectedPeriod(e.target.value)}
                            >
                                <option value="">Select period…</option>
                                {PERIOD_OPTIONS.map((period) => (
                                    <option key={period} value={period}>Period {period}</option>
                                ))}
                            </select>
                        </div>

                        {staff.length > 0 && (
                            <span className={styles.overviewCount}>{staff.length} staff</span>
                        )}
                    </div>

                    {/* ── Loading / error from homes fetch ─────────────────── */}
                    <ErrorState isLoading={false} errorMessage={homesError} onRetry={refetchHomes} />

                    {/* ── Loading / error from cover-sheet fetch ────────────── */}
                    <ErrorState isLoading={isLoading} errorMessage={fetchError} onRetry={refetch} />

                    {/* ── Filter prompt — when not all three filters are set ── */}
                    {!isLoading && !fetchError && !filtersComplete && (
                        <div className={styles.filterPrompt}>
                            <p className={styles.filterPromptTitle}>Select filters to view staff</p>
                            <p className={styles.filterPromptBody}>
                                Choose a home, pay year, and pay period above.
                            </p>
                        </div>
                    )}

                    {/* ── Staff table ──────────────────────────────────────── */}
                    {!isLoading && !fetchError && filtersComplete && (
                        <PageTable>
                            <thead>
                                <tr>
                                    <th>Staff Name</th>
                                    <PageTableHeadCell align="right">Regular Salary</PageTableHeadCell>
                                    <PageTableHeadCell align="right">Retro Bonus</PageTableHeadCell>
                                    <PageTableHeadCell align="right">Vacation Pay</PageTableHeadCell>
                                    <PageTableHeadCell align="right">Holiday Pay</PageTableHeadCell>
                                    <PageTableHeadCell align="right">Total Hours</PageTableHeadCell>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {staff.length > 0 ? (
                                    <>
                                        {staff.map((staffMember, idx) => (
                                            <PageTableRow
                                                key={staffMember.caregiver?.id}
                                                isEven={idx % 2 !== 0}
                                            >
                                                <td>
                                                    {staffMember.caregiver?.firstName} {staffMember.caregiver?.lastName}
                                                </td>
                                                <td className={styles.overviewNumCell}>
                                                    {formatNumeric(staffMember.dollars?.regular_salary)}
                                                </td>
                                                <td className={styles.overviewNumCell}>
                                                    {formatNumeric(staffMember.dollars?.retro_bonus)}
                                                </td>
                                                <td className={styles.overviewNumCell}>
                                                    {formatNumeric(staffMember.dollars?.vacation_pay)}
                                                </td>
                                                <td className={styles.overviewNumCell}>
                                                    {formatNumeric(staffMember.hours?.stat_pay)}
                                                </td>
                                                <td className={`${styles.overviewNumCell} ${styles.overviewTotalNum}`}>
                                                    {formatNumeric(staffMember.totalHours)}
                                                </td>
                                                <td className={styles.overviewActionsCell}>
                                                    <button
                                                        className={styles.overviewViewBtn}
                                                        onClick={() => handleViewCaregiver(staffMember.caregiver?.id)}
                                                        title="View caregiver payroll summary"
                                                        disabled={!staffMember.caregiver?.id}
                                                    >
                                                        <Eye size={15} />
                                                    </button>
                                                </td>
                                            </PageTableRow>
                                        ))}

                                        {/* Totals footer row */}
                                        <PageTableRow className={styles.totalRow}>
                                            <td>Totals:</td>
                                            <td className={styles.overviewNumCell}>{formatNumeric(totals.regularSalary)}</td>
                                            <td className={styles.overviewNumCell}>{formatNumeric(totals.retroBonus)}</td>
                                            <td className={styles.overviewNumCell}>{formatNumeric(totals.vacationPay)}</td>
                                            <td className={styles.overviewNumCell}>{formatNumeric(totals.holidayPay)}</td>
                                            <td className={`${styles.overviewNumCell} ${styles.overviewTotalNum}`}>
                                                {formatNumeric(totals.totalHours)}
                                            </td>
                                            <td></td>
                                        </PageTableRow>
                                    </>
                                ) : (
                                    <tr>
                                        <PageTableCell isEmpty colSpan={7}>
                                            No staff found for this pay period.
                                        </PageTableCell>
                                    </tr>
                                )}
                            </tbody>
                        </PageTable>
                    )}

                </div>
            </div>
        </PageLayout>
    );
}
