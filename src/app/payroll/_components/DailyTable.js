"use client";

// ============================================================
// IMPORTS
// ------------------------------------------------------------
// Purpose:
//   Pull in React primitives, the shared payroll stylesheet,
//   and the day-header formatter from tableHelpers.
//
// Relationship:
//   - styles (payroll.module.css) is the shared stylesheet for
//     all payroll table components (SummaryTable, DailyTable).
//   - fmtDayHeader converts ISO date strings ("2026-07-16")
//     into short "M/D" column headers ("7/16") for readability.
//   - No numeric format helpers are used — the backend always
//     returns numbers, so values are rendered directly. "—" is
//     used only as a fallback for absent (null/undefined) fields.
// ============================================================

import { useMemo } from "react";
import styles from "../payroll.module.css";
import { fmtDayHeader, buildNoteItems } from "./tableHelpers";


// ============================================================
// SECTION: DailyTable Component
// ------------------------------------------------------------
// Purpose:
//   Renders the "Payroll Hours" tab of the payroll detail page.
//   One row per caregiver with a dynamic column for each calendar
//   day in the pay period, plus a Regular summary column and a
//   Total column. A totals row at the bottom sums every column.
//
//   Requires { detail: "daily" } to be passed to the cover-sheet
//   API. When present, each staff member's response includes a
//   `daily` array: [{ date: "YYYY-MM-DD", hours: number }, ...].
//
// Columns:
//   Name | <day 1> | <day 2> | ... | <day N> | Regular | Total | Notes
//
//   Day columns are generated dynamically from the dates in
//   staff[0].daily (all caregivers share the same period dates).
//
// API field mapping:
//   Day cells   → staff[n].daily[d].hours
//   Regular     → staff[n].hours.regular
//   Total       → staff[n].totalHours
//
// Relationship:
//   - Receives `staff` from PayrollDetailPage via coverSheet.staff.
//   - Only rendered when activeTab === "daily" in PayrollDetailPage.
//
// Flow:
//   staff prop received
//        ↓
//   days derived from staff[0].daily (date strings for column headers)
//        ↓
//   useMemo computes per-day column totals + grand total
//        ↓
//   table renders: header row with dates, data rows, totals row
// ============================================================

/**
 * Payroll daily-hours breakdown table.
 *
 * @param {Object[]} props.staff - Array of staff objects from coverSheet.staff.
 *                                  Each must have a populated `daily` array
 *                                  (requires { detail: "daily" } query param).
 */
// ─── NotesCell ────────────────────────────────────────────────────────────────
//
// Shows a compact "{N} items" badge; hovering reveals a dark popup listing
// every non-zero supplemental field. Empty rows show a muted dash.
// Popup uses CSS :hover so no JS state is needed, and position: absolute
// keeps it from expanding the row height.

function NotesCell({ staffRow }) {
    const items = buildNoteItems(staffRow);

    if (items.length === 0) {
        return <td className={`${styles.td} ${styles.tdNotes}`}><span className={styles.notesEmpty}>—</span></td>;
    }

    const label = items.length === 1 ? "1 item" : `${items.length} items`;

    return (
        <td className={`${styles.td} ${styles.tdNotes}`}>
            <div className={styles.notesWrap}>
                <span className={styles.notesBadge}>{label}</span>
                <div className={styles.notesPopup}>
                    {items.map(({ label: fieldLabel, value }) => (
                        <div key={fieldLabel} className={styles.notesPopupItem}>
                            <span className={styles.notesPopupLabel}>{fieldLabel}:</span> {value}
                        </div>
                    ))}
                </div>
            </div>
        </td>
    );
}


export default function DailyTable({ staff }) {

    // ── Day column headers ────────────────────────────────────────────────────
    // Derived from the first staff member's daily array. All caregivers share
    // the same set of dates (same pay period), so index 0 is safe.
    // Falls back to [] if staff is empty or daily is missing.
    const days = staff[0]?.daily?.map((d) => d.date) ?? [];


    // ── Column totals ─────────────────────────────────────────────────────────
    // Computed once per staff change. Powers the footer totals row.
    //   dayTotals    — sum of all caregivers' hours for each calendar day
    //   totalRegular — sum of regular hours across all caregivers
    //   grandTotal   — sum of totalHours across all caregivers
    const totals = useMemo(() => {
        const dayTotals = days.map((date) =>
            staff.reduce((acc, s) => {
                const day = s.daily?.find((d) => d.date === date);
                return acc + (day?.hours ?? 0);
            }, 0)
        );
        const totalRegular = staff.reduce((acc, s) => acc + (s.hours?.regular ?? 0), 0);
        const grandTotal   = staff.reduce((acc, s) => acc + (s.totalHours     ?? 0), 0);
        return { dayTotals, totalRegular, grandTotal };
    }, [staff, days]);


    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className={styles.tableWrapper}>
            {/*
                tableDaily adds extra CSS for the wide day-column layout
                (sets min-width per day cell to allow horizontal scroll).
            */}
            <table className={`${styles.table} ${styles.tableDaily}`}>
                <thead>
                    <tr>
                        {/* Name column is sticky so it stays visible during horizontal scroll */}
                        <th className={`${styles.th} ${styles.thName} ${styles.stickyCol}`}>Name</th>

                        {/* One column per calendar day in the pay period, labelled "M/D" */}
                        {days.map((date) => (
                            <th key={date} className={`${styles.th} ${styles.thDay}`}>
                                {fmtDayHeader(date)}
                            </th>
                        ))}

                        {/* Regular is a period summary field, not a re-sum of daily hours */}
                        <th className={styles.th}>Regular</th>

                        <th className={`${styles.th} ${styles.thTotal}`}>Total</th>

                        {/* Non-zero supplemental fields (all hours except regular, plus dollars) */}
                        <th className={`${styles.th} ${styles.thNotes}`}>Notes</th>
                    </tr>
                </thead>
                <tbody>
                    {/* ── Data rows — one per caregiver ─────────────────────── */}
                    {staff.map((s) => (
                        <tr key={s.caregiver?.id} className={styles.tr}>
                            <td className={`${styles.td} ${styles.tdName} ${styles.stickyCol}`}>
                                {s.caregiver?.firstName} {s.caregiver?.lastName}
                            </td>

                            {/* Per-day cells — tdDayActive adds a highlight when hours > 0 */}
                            {days.map((date) => {
                                const day = s.daily?.find((d) => d.date === date);
                                const hrs = day?.hours ?? 0;
                                return (
                                    <td
                                        key={date}
                                        className={`${styles.td} ${styles.tdDay} ${hrs > 0 ? styles.tdDayActive : ""}`}
                                    >
                                        {hrs}
                                    </td>
                                );
                            })}

                            <td className={styles.td}>{s.hours?.regular ?? "—"}</td>
                            <td className={`${styles.td} ${styles.tdTotal}`}>{s.totalHours ?? "—"}</td>

                            {/* Notes cell — shows non-zero supplemental fields.
                                Truncated inline; full list appears on hover via CSS tooltip. */}
                            <NotesCell staffRow={s} />
                        </tr>
                    ))}

                    {/* ── Totals row ────────────────────────────────────────── */}
                    {/* Column sums across all caregivers */}
                    <tr className={styles.totalRow}>
                        <td className={`${styles.td} ${styles.tdName} ${styles.stickyCol}`}>Total</td>
                        {totals.dayTotals.map((t, i) => (
                            <td key={i} className={`${styles.td} ${styles.tdDay}`}>{t}</td>
                        ))}
                        <td className={styles.td}>{totals.totalRegular}</td>
                        <td className={`${styles.td} ${styles.tdTotal}`}>{totals.grandTotal}</td>
                        <td className={styles.td}></td>
                    </tr>
                </tbody>
            </table>
        </div>
    );
}
