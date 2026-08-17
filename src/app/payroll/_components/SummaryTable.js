"use client";

// ============================================================
// IMPORTS
// ------------------------------------------------------------
// Purpose:
//   Pull in React primitives and the shared payroll stylesheet.
//
// Relationship:
//   - styles (payroll.module.css) is the shared stylesheet for
//     all payroll table components (SummaryTable, DailyTable).
//   - No format helpers are imported — the backend always returns
//     numbers, so values are rendered directly. "—" is used only
//     as a fallback for absent (null/undefined) fields.
// ============================================================

import { useMemo } from "react";
import styles from "../payroll.module.css";


// ============================================================
// SECTION: SummaryTable Component
// ------------------------------------------------------------
// Purpose:
//   Renders the "Payroll Cover Sheet" tab of the payroll detail
//   page. One row per caregiver showing their period totals
//   across all hour types, plus a computed totals row at the
//   bottom matching the printed cover-sheet template.
//
// Columns (matching the physical template):
//   Staff Name | Regular | Other | Holiday | Training |
//   Staff Meeting | Sick | Bereavement | Banked Hours Paid |
//   Vacation $$ | Hours Banked | Total
//
// API field mapping (staff[n].hours / staff[n].dollars):
//   Regular            → hours.regular
//   Other              → hours.other
//   Holiday            → hours.stat_pay  (statutory holiday pay)
//   Training           → hours.training
//   Staff Meeting      → hours.staff_meeting
//   Sick               → hours.sick
//   Bereavement        → hours.bereavement
//   Banked Hours Paid  → hours.banked_hours_paid
//   Vacation $$        → dollars.vacation_pay
//   Hours Banked       → hours.hours_banked
//   Total              → totalHours  (top-level field on each staff object)
//
// Relationship:
//   - Receives `staff` from PayrollDetailPage via coverSheet.staff.
//   - The totals row is computed client-side by summing each column
//     across the staff array.
//
// Flow:
//   staff prop received
//        ↓
//   useMemo computes column totals once per staff change
//        ↓
//   table renders staff rows + totals row
// ============================================================

/**
 * Payroll cover-sheet summary table.
 *
 * @param {Object[]} props.staff - Array of staff objects from coverSheet.staff.
 */
export default function SummaryTable({ staff }) {

    // ── Column totals ─────────────────────────────────────────────────────────
    // Computed once whenever the staff array changes.
    // Used exclusively in the "Totals:" footer row.
    const totals = useMemo(() => {
        const sumHours   = (key) => staff.reduce((acc, s) => acc + (s.hours?.[key]   ?? 0), 0);
        const sumDollars = (key) => staff.reduce((acc, s) => acc + (s.dollars?.[key] ?? 0), 0);
        return {
            regular:         sumHours("regular"),
            other:           sumHours("other"),
            holiday:         sumHours("stat_pay"),
            training:        sumHours("training"),
            staffMeeting:    sumHours("staff_meeting"),
            sick:            sumHours("sick"),
            bereavement:     sumHours("bereavement"),
            bankedHoursPaid: sumHours("banked_hours_paid"),
            vacationPay:     sumDollars("vacation_pay"),
            hoursBanked:     sumHours("hours_banked"),
            total:           staff.reduce((acc, s) => acc + (s.totalHours ?? 0), 0),
        };
    }, [staff]);


    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className={styles.tableWrapper}>
            <table className={styles.table}>
                <thead>
                    <tr>
                        {/* Staff Name is sticky so it stays visible on horizontal scroll */}
                        <th className={`${styles.th} ${styles.thName} ${styles.stickyCol}`}>Staff Name</th>
                        <th className={styles.th}>Regular</th>
                        <th className={styles.th}>Other</th>
                        {/* "Holiday" = statutory holiday pay (stat_pay in the API) */}
                        <th className={styles.th}>Holiday</th>
                        <th className={styles.th}>Training</th>
                        <th className={styles.th}>Staff Meeting</th>
                        <th className={styles.th}>Sick</th>
                        <th className={styles.th}>Bereavement</th>
                        <th className={styles.th}>Banked Hours Paid</th>
                        <th className={styles.th}>Vacation $$</th>
                        <th className={styles.th}>Hours Banked</th>
                        {/* Total column is visually distinct to match the printed sheet */}
                        <th className={`${styles.th} ${styles.thTotal}`}>Total</th>
                    </tr>
                </thead>
                <tbody>
                    {/* ── Data rows — one per caregiver ─────────────────────── */}
                    {staff.map((s) => (
                        <tr key={s.caregiver?.id} className={styles.tr}>
                            <td className={`${styles.td} ${styles.tdName} ${styles.stickyCol}`}>
                                {s.caregiver?.firstName} {s.caregiver?.lastName}
                            </td>
                            <td className={styles.td}>{s.hours?.regular       ?? "—"}</td>
                            <td className={styles.td}>{s.hours?.other         ?? "—"}</td>
                            <td className={styles.td}>{s.hours?.stat_pay      ?? "—"}</td>
                            <td className={styles.td}>{s.hours?.training      ?? "—"}</td>
                            <td className={styles.td}>{s.hours?.staff_meeting ?? "—"}</td>
                            <td className={styles.td}>{s.hours?.sick          ?? "—"}</td>
                            <td className={styles.td}>{s.hours?.bereavement   ?? "—"}</td>
                            <td className={styles.td}>{s.hours?.banked_hours_paid ?? "—"}</td>
                            <td className={styles.td}>{s.dollars?.vacation_pay   ?? "—"}</td>
                            <td className={styles.td}>{s.hours?.hours_banked     ?? "—"}</td>
                            <td className={`${styles.td} ${styles.tdTotal}`}>{s.totalHours ?? "—"}</td>
                        </tr>
                    ))}

                    {/* ── Totals row ────────────────────────────────────────── */}
                    {/* Sums every column across all caregivers */}
                    <tr className={styles.totalRow}>
                        <td className={`${styles.td} ${styles.tdName} ${styles.stickyCol}`}>Totals:</td>
                        <td className={styles.td}>{totals.regular}</td>
                        <td className={styles.td}>{totals.other}</td>
                        <td className={styles.td}>{totals.holiday}</td>
                        <td className={styles.td}>{totals.training}</td>
                        <td className={styles.td}>{totals.staffMeeting}</td>
                        <td className={styles.td}>{totals.sick}</td>
                        <td className={styles.td}>{totals.bereavement}</td>
                        <td className={styles.td}>{totals.bankedHoursPaid}</td>
                        <td className={styles.td}>{totals.vacationPay}</td>
                        <td className={styles.td}>{totals.hoursBanked}</td>
                        <td className={`${styles.td} ${styles.tdTotal}`}>{totals.total}</td>
                    </tr>
                </tbody>
            </table>
        </div>
    );
}
