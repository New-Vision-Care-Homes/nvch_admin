"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
    Undo2, Clock,
    ClipboardCheck, AlertTriangle,
    Users, Activity, CalendarClock, Building2,
} from "lucide-react";
import PageLayout  from "@components/layout/PageLayout";
import ErrorState  from "@components/UI/ErrorState";
import Button      from "@components/UI/Button";
import StatusBadge, { ColorPill } from "@components/UI/Badge";
import styles from "./house_reviews.module.css";
import { useHouseReviews } from "@/hooks/usePayroll";
import { usePayPeriod }    from "@/hooks/usePayPeriods";
import { useAdmins }        from "@/hooks/useAdmins";
import { formatDateTime }    from "@/utils/dates";
import { REGION_OPTIONS }    from "@/utils/dropdownList/region";
import { HOME_TYPE_COLORS }  from "@/utils/dropdownList/homeType";
import { REGION_COLORS }     from "@/utils/dropdownList/region";
import { COLOR_FALLBACK }    from "@/utils/dropdownList/shared";

// ─── Constants ────────────────────────────────────────────────────────────────

const CURRENT_YEAR   = new Date().getFullYear();
const YEAR_OPTIONS   = [CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1];
const PERIOD_OPTIONS = Array.from({ length: 26 }, (_, i) => i + 1);

const SUPERVISOR_TONE  = { pending: "warning",  reviewed:  "success" };
const PAYROLL_TONE     = { pending: "neutral",  processing: "info",   processed: "success" };
const SUPERVISOR_LABEL = { pending: "Pending",  reviewed:  "Reviewed" };
const PAYROLL_LABEL    = { pending: "Pending",  processing: "Processing", processed: "Processed" };

const TONE_ACCENT = {
    warning: "#f59e0b",
    success: "#10b981",
    info:    "#3b82f6",
    neutral: "#94a3b8",
    danger:  "#ef4444",
};

function fullName(person) {
    if (!person) return null;
    return [person.firstName, person.lastName].filter(Boolean).join(" ") || null;
}

// ─── Detail row (label + value, always rendered) ─────────────────────────────

function DetailRow({ label, value }) {
    return (
        <div className={styles.detailRow}>
            <span className={styles.detailLabel}>{label}</span>
            <span className={`${styles.detailValue} ${!value ? styles.detailEmpty : ""}`}>
                {value ?? "—"}
            </span>
        </div>
    );
}

// ─── House card ───────────────────────────────────────────────────────────────

function HouseCard({ houseRow, resolveName }) {
    const {
        home: rawHome,
        exists,
        supervisorStatus,
        supervisorReviewedAt,
        supervisorReviewedBy,
        supervisorNote,
        supervisors      = [],
        payrollStatus,
        payrollStatusAt,
        payrollStatusBy,
        payrollNote,
        staffCount,
        totalHours,
        unresolvedHours,
        hasActivity,
        reviewDueAt,
        isOverdue,
        overdueNotifiedAt,
        history          = [],
    } = houseRow;
    const home = rawHome ?? {};

    const isCommunityRow = rawHome === null;
    const typeColor      = HOME_TYPE_COLORS[home.homeType] || COLOR_FALLBACK;
    const supervisorTone = SUPERVISOR_TONE[supervisorStatus] ?? "neutral";
    const payrollTone    = PAYROLL_TONE[payrollStatus]       ?? "neutral";

    const supervisorNames = supervisors.length > 0
        ? supervisors.map((s) => resolveName(s)).filter(Boolean).join("  ·  ")
        : null;

    return (
        <div className={styles.houseCard}>

            {/* ── Identity row ──────────────────────────────────────────── */}
            <div className={styles.identityRow}>
                <div className={styles.identityLeft}>
                    <div className={styles.homeTitleLine}>
                        <Building2 size={14} style={{ color: isCommunityRow ? "#94a3b8" : typeColor.border, flexShrink: 0 }} />
                        <span className={styles.homeName}>
                            {isCommunityRow ? "Other Hours" : (home.name ?? "Unknown Home")}
                        </span>
                        {!isCommunityRow && (
                            <span className={exists ? styles.startedTag : styles.notStartedTag}>
                                {exists ? "Started" : "Not started"}
                            </span>
                        )}
                        {isOverdue && (
                            <span className={styles.overdueTag}>
                                <AlertTriangle size={10} />
                                Overdue
                            </span>
                        )}
                    </div>
                    {isCommunityRow ? (
                        <p className={styles.communityNote}>
                            Hours not associated with any specific house for this period.
                        </p>
                    ) : (
                        <div className={styles.homeMeta}>
                            {home.homeType
                                ? <ColorPill label={home.homeType} color={HOME_TYPE_COLORS[home.homeType] || COLOR_FALLBACK} />
                                : <span className={styles.metaEmpty}>No type</span>
                            }
                            {home.region
                                ? <ColorPill label={home.region} color={REGION_COLORS[home.region] || COLOR_FALLBACK} />
                                : <span className={styles.metaEmpty}>No region</span>
                            }
                            {!home.isActive && <span className={styles.inactiveTag}>Inactive</span>}
                        </div>
                    )}
                </div>
                <div className={styles.identityRight}>
                    <div className={styles.dueLine}>
                        <CalendarClock size={12} />
                        <span className={isOverdue ? styles.dueOverdue : styles.dueNormal}>
                            Due {reviewDueAt ? formatDateTime(reviewDueAt) : "—"}
                        </span>
                    </div>
                    {overdueNotifiedAt && (
                        <div className={styles.notifiedLine}>
                            <Clock size={11} />
                            <span>Notice sent {formatDateTime(overdueNotifiedAt)}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Supervisors assigned ──────────────────────────────────── */}
            {!isCommunityRow && (
                <div className={styles.supervisorsRow}>
                    <Users size={12} className={styles.supervisorsIcon} />
                    <span className={styles.supervisorsLabel}>Supervisors</span>
                    <span className={`${styles.supervisorsValue} ${!supervisorNames ? styles.detailEmpty : ""}`}>
                        {supervisorNames ?? "None assigned"}
                    </span>
                </div>
            )}

            {/* ── Status panels ─────────────────────────────────────────── */}
            <div className={styles.statusPanels}>

                {/* Supervisor panel */}
                <div
                    className={styles.statusPanel}
                    style={{ "--panel-accent": TONE_ACCENT[supervisorTone] }}
                >
                    <div className={styles.panelHeader}>
                        <span className={styles.panelTitle}>Supervisor Review</span>
                        <StatusBadge
                            label={SUPERVISOR_LABEL[supervisorStatus] ?? supervisorStatus}
                            tone={supervisorTone}
                            size="tag"
                        />
                    </div>
                    <div className={styles.panelBody}>
                        <DetailRow label="Reviewed by" value={resolveName(supervisorReviewedBy)} />
                        <DetailRow label="Reviewed at" value={supervisorReviewedAt ? formatDateTime(supervisorReviewedAt) : null} />
                        <DetailRow label="Note"        value={supervisorNote} />
                    </div>
                </div>

                {/* Payroll panel */}
                <div
                    className={styles.statusPanel}
                    style={{ "--panel-accent": TONE_ACCENT[payrollTone] }}
                >
                    <div className={styles.panelHeader}>
                        <span className={styles.panelTitle}>Payroll Status</span>
                        <StatusBadge
                            label={PAYROLL_LABEL[payrollStatus] ?? payrollStatus}
                            tone={payrollTone}
                            size="tag"
                        />
                    </div>
                    <div className={styles.panelBody}>
                        <DetailRow label="Updated by" value={resolveName(payrollStatusBy)} />
                        <DetailRow label="Updated at" value={payrollStatusAt ? formatDateTime(payrollStatusAt) : null} />
                        <DetailRow label="Note"       value={payrollNote} />
                    </div>
                </div>
            </div>

            {/* ── Metrics row ───────────────────────────────────────────── */}
            <div className={styles.metricsRow}>
                <div className={styles.metricBlock}>
                    <span className={styles.metricNum}>{staffCount ?? 0}</span>
                    <span className={styles.metricLabel}>Staff</span>
                </div>
                <div className={styles.metricDivider} />
                <div className={styles.metricBlock}>
                    <span className={styles.metricNum}>
                        {totalHours != null ? Number(totalHours).toFixed(1) : "—"}
                    </span>
                    <span className={styles.metricLabel}>Total Hours</span>
                </div>
                <div className={styles.metricDivider} />
                <div className={`${styles.metricBlock} ${unresolvedHours > 0 ? styles.metricBlockWarn : ""}`}>
                    <span className={styles.metricNum}>
                        {unresolvedHours != null ? Number(unresolvedHours).toFixed(1) : "—"}
                    </span>
                    <span className={styles.metricLabel}>Unresolved</span>
                </div>
                <div className={styles.metricDivider} />
                <div className={`${styles.metricBlock} ${hasActivity ? styles.metricBlockActive : ""}`}>
                    <Activity size={14} className={styles.metricIcon} />
                    <span className={styles.metricLabel}>{hasActivity ? "Has Activity" : "No Activity"}</span>
                </div>
                <div className={styles.metricDivider} />
                <div className={styles.metricBlock}>
                    <span className={styles.metricNum}>{history.length}</span>
                    <span className={styles.metricLabel}>History</span>
                </div>
            </div>

        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HouseReviewsPage() {
    const router       = useRouter();
    const searchParams = useSearchParams();

    const [selectedYear,    setSelectedYear]    = useState(searchParams.get("payYear")      ?? "");
    const [selectedPeriod,  setSelectedPeriod]  = useState(searchParams.get("periodNumber") ?? "");
    const [defaultsApplied, setDefaultsApplied] = useState(!!(searchParams.get("payYear") && searchParams.get("periodNumber")));

    const { payPeriod: currentPeriod } = usePayPeriod(0);
    useEffect(() => {
        if (currentPeriod && !defaultsApplied) {
            setSelectedYear(String(currentPeriod.payYear));
            setSelectedPeriod(String(currentPeriod.periodNumber));
            setDefaultsApplied(true);
        }
    }, [currentPeriod, defaultsApplied]);

    const periodReady = !!(selectedYear && selectedPeriod);

    const [mine,             setMine]             = useState(false);
    const [supervisorFilter, setSupervisorFilter] = useState("");
    const [payrollFilter,    setPayrollFilter]    = useState("");
    const [regionFilter,     setRegionFilter]     = useState("");
    const [hasActivityOnly,  setHasActivityOnly]  = useState(false);
    const [includeInactive,  setIncludeInactive]  = useState(false);

    const apiParams = useMemo(() => {
        const p = {};
        if (mine)             p.mine                 = true;
        if (supervisorFilter) p.supervisorStatus     = supervisorFilter;
        if (payrollFilter)    p.payrollStatus        = payrollFilter;
        if (regionFilter)     p.region               = regionFilter;
        if (hasActivityOnly)  p.hasActivity          = true;
        if (includeInactive)  p.includeInactiveHomes = true;
        return p;
    }, [mine, supervisorFilter, payrollFilter, regionFilter, hasActivityOnly, includeInactive]);

    const { payPeriod, reviewDueAt, houses, counts, isLoading, fetchError, refetch } =
        useHouseReviews({ payYear: selectedYear, periodNumber: selectedPeriod, params: apiParams, enabled: periodReady });

    const { admins } = useAdmins({ params: { limit: 200 } });
    const adminMap = useMemo(
        () => new Map(admins.map((a) => [String(a.id), a])),
        [admins]
    );
    const resolveName = (idOrObj) => {
        if (!idOrObj) return null;
        if (typeof idOrObj === "object") return fullName(idOrObj);
        const admin = adminMap.get(String(idOrObj));
        return admin ? fullName(admin) : null;
    };

    const hasActiveFilters = mine || supervisorFilter || payrollFilter || regionFilter || hasActivityOnly || includeInactive;

    const clearFilters = () => {
        setMine(false);
        setSupervisorFilter("");
        setPayrollFilter("");
        setRegionFilter("");
        setHasActivityOnly(false);
        setIncludeInactive(false);
    };

    const handleBack = () => {
        const qs = new URLSearchParams({ payYear: selectedYear, periodNumber: selectedPeriod }).toString();
        router.push(`/payroll?${qs}`);
    };

    return (
        <PageLayout>
            <div className={styles.pageContainer}>

                {/* ── Page header ──────────────────────────────────────────── */}
                <div className={styles.pageHeader}>
                    <div className={styles.titleBlock}>
                        <h1>House Reviews</h1>
                        <div className={styles.titleMeta}>
                            <select
                                className={styles.periodSelect}
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(e.target.value)}
                            >
                                <option value="">Year…</option>
                                {YEAR_OPTIONS.map((y) => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </select>
                            <select
                                className={styles.periodSelect}
                                value={selectedPeriod}
                                onChange={(e) => setSelectedPeriod(e.target.value)}
                            >
                                <option value="">Period…</option>
                                {PERIOD_OPTIONS.map((p) => (
                                    <option key={p} value={p}>Period {p}</option>
                                ))}
                            </select>
                            {reviewDueAt && (
                                <span className={styles.dueBadge}>
                                    <Clock size={11} />
                                    Due {formatDateTime(reviewDueAt)}
                                </span>
                            )}
                        </div>
                    </div>
                    <Button variant="secondary" icon={<Undo2 size={15} />} onClick={handleBack}>
                        Back
                    </Button>
                </div>

                <ErrorState isLoading={isLoading} errorMessage={fetchError} onRetry={refetch} />

                {!isLoading && !fetchError && (
                    <>
                        {/* ── Stat strip ───────────────────────────────────── */}
                        <div className={styles.statStrip}>
                            <div className={styles.statItem}>
                                <span className={styles.statNum}>{houses.length}</span>
                                <span className={styles.statLbl}>Total Houses</span>
                            </div>
                            <div className={styles.statItem}>
                                <span className={styles.statNum}>{counts.supervisor?.pending ?? 0}</span>
                                <span className={styles.statLbl}>Supervisor Pending</span>
                            </div>
                            <div className={styles.statItem}>
                                <span className={styles.statNum}>{counts.supervisor?.reviewed ?? 0}</span>
                                <span className={styles.statLbl}>Supervisor Reviewed</span>
                            </div>
                            <div className={styles.statItem}>
                                <span className={styles.statNum}>{counts.payroll?.processed ?? 0}</span>
                                <span className={styles.statLbl}>Payroll Processed</span>
                            </div>
                            <div className={`${styles.statItem} ${(counts.overdue ?? 0) > 0 ? styles.statItemOverdue : ""}`}>
                                <span className={styles.statNum}>{counts.overdue ?? 0}</span>
                                <span className={styles.statLbl}>Overdue</span>
                            </div>
                        </div>

                        {/* ── Filters ──────────────────────────────────────── */}
                        <div className={styles.filterToolbar}>
                            {/* Toggle chips */}
                            <div className={styles.filterChips}>
                                <button
                                    className={`${styles.chip} ${mine ? styles.chipActive : ""}`}
                                    onClick={() => setMine((v) => !v)}
                                >
                                    Mine only
                                </button>
                                <button
                                    className={`${styles.chip} ${hasActivityOnly ? styles.chipActive : ""}`}
                                    onClick={() => setHasActivityOnly((v) => !v)}
                                >
                                    Has activity
                                </button>
                                <button
                                    className={`${styles.chip} ${includeInactive ? styles.chipActive : ""}`}
                                    onClick={() => setIncludeInactive((v) => !v)}
                                >
                                    Include inactive
                                </button>
                            </div>

                            <div className={styles.filterSep} />

                            {/* Select filters */}
                            <select className={styles.filterInlineSelect} value={regionFilter} onChange={(e) => setRegionFilter(e.target.value)}>
                                <option value="">All regions</option>
                                {REGION_OPTIONS.map((r) => (
                                    <option key={r.value} value={r.value}>{r.label}</option>
                                ))}
                            </select>

                            <select className={styles.filterInlineSelect} value={supervisorFilter} onChange={(e) => setSupervisorFilter(e.target.value)}>
                                <option value="">Supervisor: all</option>
                                <option value="pending">Pending</option>
                                <option value="reviewed">Reviewed</option>
                            </select>

                            <select className={styles.filterInlineSelect} value={payrollFilter} onChange={(e) => setPayrollFilter(e.target.value)}>
                                <option value="">Payroll: all</option>
                                <option value="pending">Pending</option>
                                <option value="processing">Processing</option>
                                <option value="processed">Processed</option>
                            </select>

                            {/* Clear + count */}
                            {hasActiveFilters && (
                                <button className={styles.clearBtn} onClick={clearFilters}>
                                    Clear filters
                                </button>
                            )}
                            <span className={styles.resultCount}>{houses.length} homes</span>
                        </div>

                        {/* ── House cards ──────────────────────────────────── */}
                        {houses.length === 0 ? (
                            <div className={styles.emptyState}>
                                <ClipboardCheck size={36} />
                                <p>No houses match the current filters.</p>
                            </div>
                        ) : (
                            <div className={styles.cardGrid}>
                                {houses.map((houseRow) => (
                                    <HouseCard key={houseRow.houseId} houseRow={houseRow} resolveName={resolveName} />
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>
        </PageLayout>
    );
}
