"use client";

// ============================================================
// IMPORTS
// ============================================================

import { useState, useEffect } from "react";
import Link from "next/link";
import PageLayout from "@components/layout/PageLayout";
import ErrorState  from "@/components/UI/ErrorState";
import EmptyState  from "@/components/UI/EmptyState";
import StatusBadge from "@/components/UI/Badge";
import IconButton  from "@/components/UI/IconButton";
import { PageTable, PageTableRow } from "@components/UI/Table";
import { useHolidays }    from "@/hooks/useHolidays";
import { usePayPeriod }   from "@/hooks/usePayPeriods";
import { useProfile }     from "@/hooks/useProfile";
import { formatDateOnly } from "@/utils/dates";
import { Sun, Eye }       from "lucide-react";
import styles from "./holidays.module.css";

// ============================================================
// CONSTANTS
// ============================================================

const CURRENT_YEAR   = new Date().getFullYear();
const YEAR_OPTIONS   = [CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1];
const PERIOD_OPTIONS = Array.from({ length: 26 }, (_, i) => i + 1);

// ============================================================
// SECTION: Sub-components
// ============================================================

// ── GrantCell ─────────────────────────────────────────────────────────────────
// Human-readable grant summary replacing the old Caregiver Rules column.
//   proratedToWorkedHours true  → "Prorated to worked hours"
//   proratedToWorkedHours false → "Fixed · 12 h"

function GrantCell({ holiday }) {
    if (holiday.proratedToWorkedHours) {
        return <span className={styles.proratedLabel}>Prorated to worked hours</span>;
    }
    return (
        <span className={styles.fixedGrantLabel}>
            Fixed · {holiday.grantHours ?? 12} h
        </span>
    );
}

// ============================================================
// SECTION: HolidaysPage
// ============================================================
//
// Stat-holiday list with year / pay-period filter.
// Accessible to admins with view_holidays OR view_payroll (enforced in sidebar).
//
// Filter modes (mutually exclusive):
//   Year mode   — ?year=YYYY
//   Period mode — ?payYear=YYYY&periodNumber=N
//
// Optional: ?isActive=true|false (omit to return both).
//
// The year is pre-seeded from usePayPeriod(0) so the page loads with
// meaningful data on first render.

export default function HolidaysPage() {

    // ── Profile / permissions ──────────────────────────────────────────────────
    const { profile } = useProfile();
    const slugs     = profile?.permissionSlugs ?? [];
    const canManage = slugs.includes("manage_holidays");

    // ── Filter state ───────────────────────────────────────────────────────────
    const [filterMode,      setFilterMode]      = useState("year"); // "year" | "period"
    const [selectedYear,    setSelectedYear]    = useState(String(CURRENT_YEAR));
    const [selectedPayYear, setSelectedPayYear] = useState(String(CURRENT_YEAR));
    const [selectedPeriod,  setSelectedPeriod]  = useState("");
    const [isActiveFilter,  setIsActiveFilter]  = useState(""); // "" | "true" | "false"
    const [defaultsSeeded,  setDefaultsSeeded]  = useState(false);

    // Pre-fill year from the current pay period
    const { payPeriod } = usePayPeriod(0);
    useEffect(() => {
        if (payPeriod && !defaultsSeeded) {
            setSelectedYear(String(payPeriod.payYear));
            setSelectedPayYear(String(payPeriod.payYear));
            setDefaultsSeeded(true);
        }
    }, [payPeriod, defaultsSeeded]);

    // ── API params ─────────────────────────────────────────────────────────────
    const queryParams = filterMode === "year"
        ? { year: selectedYear, ...(isActiveFilter !== "" && { isActive: isActiveFilter }) }
        : { payYear: selectedPayYear, periodNumber: selectedPeriod, ...(isActiveFilter !== "" && { isActive: isActiveFilter }) };

    const isReady = filterMode === "year"
        ? !!selectedYear
        : !!selectedPayYear && !!selectedPeriod;

    const { holidays, isLoading, fetchError, refetch } = useHolidays(queryParams, { enabled: isReady });

    // ── Handlers ───────────────────────────────────────────────────────────────
    const handleModeChange = (mode) => {
        setFilterMode(mode);
        if (mode === "year") setSelectedPeriod("");
    };

    // ── Render ─────────────────────────────────────────────────────────────────
    return (
        <PageLayout>
            <div className={styles.pageContainer}>

                {/* ── Page header ─────────────────────────────────────────── */}
                <div className={styles.pageHeader}>
                    <h1>Holidays</h1>
                    <div className={styles.headerActions}>
                        {canManage && (
                            <Link href="/holidays/new" className={styles.addButton}>
                                + Add Holiday
                            </Link>
                        )}
                    </div>
                </div>

                {/* ── Filter bar ──────────────────────────────────────────── */}
                <div className={styles.filterBar}>

                    {/* Mode toggle: Year | Pay Period */}
                    <div className={styles.filterGroup}>
                        <span className={styles.filterLabel}>Filter by</span>
                        <div className={styles.modeToggle}>
                            <button
                                className={`${styles.modeBtn} ${filterMode === "year" ? styles.modeBtnActive : ""}`}
                                onClick={() => handleModeChange("year")}
                            >
                                Year
                            </button>
                            <button
                                className={`${styles.modeBtn} ${filterMode === "period" ? styles.modeBtnActive : ""}`}
                                onClick={() => handleModeChange("period")}
                            >
                                Pay Period
                            </button>
                        </div>
                    </div>

                    {/* Year selector */}
                    <div className={styles.filterGroup}>
                        <span className={styles.filterLabel}>Year</span>
                        <select
                            className={styles.filterSelect}
                            value={filterMode === "year" ? selectedYear : selectedPayYear}
                            onChange={(e) =>
                                filterMode === "year"
                                    ? setSelectedYear(e.target.value)
                                    : setSelectedPayYear(e.target.value)
                            }
                        >
                            {YEAR_OPTIONS.map((year) => (
                                <option key={year} value={year}>{year}</option>
                            ))}
                        </select>
                    </div>

                    {/* Period selector — only in period mode */}
                    {filterMode === "period" && (
                        <div className={styles.filterGroup}>
                            <span className={styles.filterLabel}>Period</span>
                            <select
                                className={styles.filterSelect}
                                value={selectedPeriod}
                                onChange={(e) => setSelectedPeriod(e.target.value)}
                            >
                                <option value="">Select period…</option>
                                {PERIOD_OPTIONS.map((p) => (
                                    <option key={p} value={p}>Period {p}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Status filter */}
                    <div className={styles.filterGroup}>
                        <span className={styles.filterLabel}>Status</span>
                        <select
                            className={styles.filterSelect}
                            value={isActiveFilter}
                            onChange={(e) => setIsActiveFilter(e.target.value)}
                        >
                            <option value="">All</option>
                            <option value="true">Active</option>
                            <option value="false">Inactive</option>
                        </select>
                    </div>

                </div>

                {/* ── Loading / error ──────────────────────────────────────── */}
                <ErrorState isLoading={isLoading} errorMessage={fetchError} onRetry={refetch} />

                {/* ── Holiday table ────────────────────────────────────────── */}
                {!isLoading && !fetchError && isReady && (
                    holidays.length === 0 ? (
                        <EmptyState
                            title="No holidays found"
                            message="No holidays have been created for this period yet."
                        />
                    ) : (
                        <PageTable>
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Date</th>
                                    <th>Grant</th>
                                    <th>Status</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {holidays.map((holiday, idx) => (
                                    <PageTableRow key={holiday.id} isEven={idx % 2 !== 0}>
                                        <td className={styles.tdName}>
                                            {holiday.name}
                                        </td>
                                        <td className={styles.tdDate}>
                                            {formatDateOnly(holiday.date)}
                                        </td>
                                        <td className={styles.tdGrant}>
                                            <GrantCell holiday={holiday} />
                                        </td>
                                        <td className={styles.tdStatus}>
                                            <StatusBadge
                                                label={holiday.isActive ? "Active" : "Inactive"}
                                                tone={holiday.isActive ? "success" : "neutral"}
                                            />
                                        </td>
                                        <td className={styles.actionsCell}>
                                            <IconButton href={`/holidays/${holiday.id}`} title="View details">
                                                <Eye size={15} />
                                            </IconButton>
                                        </td>
                                    </PageTableRow>
                                ))}
                            </tbody>
                        </PageTable>
                    )
                )}

                {/* ── Prompt when period mode but no period selected ────────── */}
                {!isLoading && !fetchError && !isReady && (
                    <div className={styles.promptState}>
                        <Sun size={36} className={styles.promptIcon} />
                        <p>Select a pay year and period to view holidays.</p>
                    </div>
                )}

            </div>
        </PageLayout>
    );
}
