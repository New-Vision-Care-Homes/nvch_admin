"use client";

import { useMemo } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import {
    Undo2, Building2, Users, ArrowRight,
    Clock, CalendarClock, Activity, AlertTriangle, User,
} from "lucide-react";
import PageLayout    from "@components/layout/PageLayout";
import ErrorState    from "@components/UI/ErrorState";
import Button        from "@components/UI/Button";
import StatusBadge, { ColorPill } from "@components/UI/Badge";
import styles from "./review_history.module.css";
import { useHouseReview } from "@/hooks/usePayroll";
import { useAdmins }     from "@/hooks/useAdmins";
import { formatDateTime } from "@/utils/dates";
import { HOME_TYPE_COLORS } from "@/utils/dropdownList/homeType";
import { REGION_COLORS }    from "@/utils/dropdownList/region";
import { COLOR_FALLBACK }   from "@/utils/dropdownList/shared";

// ─── Constants ────────────────────────────────────────────────────────────────

const SUPERVISOR_TONE  = { pending: "warning",  reviewed:   "success" };
const PAYROLL_TONE     = { pending: "neutral",  processing: "info",   processed: "success" };
const SUPERVISOR_LABEL = { pending: "Pending",  reviewed:   "Reviewed" };
const PAYROLL_LABEL    = { pending: "Pending",  processing: "Processing", processed: "Processed" };

const FLAG_LABEL = { supervisor: "Supervisor Review", payroll: "Payroll Status" };

const TONE_ACCENT = {
    warning: "#f59e0b",
    success: "#10b981",
    info:    "#3b82f6",
    neutral: "#94a3b8",
};

function statusLabel(flag, value) {
    if (!value) return value;
    return flag === "supervisor"
        ? (SUPERVISOR_LABEL[value] ?? value)
        : (PAYROLL_LABEL[value]    ?? value);
}

function statusTone(flag, value) {
    return flag === "supervisor"
        ? (SUPERVISOR_TONE[value] ?? "neutral")
        : (PAYROLL_TONE[value]    ?? "neutral");
}

function fullName(person) {
    if (!person) return null;
    return [person.firstName, person.lastName].filter(Boolean).join(" ") || null;
}

// ─── Person pill ──────────────────────────────────────────────────────────────

function PersonPill({ name }) {
    if (!name) return null;
    return (
        <span className={styles.personPill}>
            <User size={11} />
            {name}
        </span>
    );
}

// ─── Detail row ───────────────────────────────────────────────────────────────

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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ReviewHistoryPage() {
    const { id: homeId } = useParams();
    const searchParams   = useSearchParams();
    const router         = useRouter();

    const payYear      = searchParams.get("payYear")      || "";
    const periodNumber = searchParams.get("periodNumber") || "";

    const {
        payPeriod,
        house,
        supervisors,
        review,
        activity,
        isLoading,
        fetchError,
        refetch,
    } = useHouseReview({
        houseId:      homeId,
        payYear:      payYear      ? Number(payYear)      : undefined,
        periodNumber: periodNumber ? Number(periodNumber) : undefined,
        enabled:      !!(homeId && payYear && periodNumber),
    });

    const { admins } = useAdmins({ params: { limit: 200 } });

    // Resolve a raw ID string (or already-populated object) to a display name
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

    const isCommunityRow = homeId === "community";
    const history     = review?.history ?? [];
    const typeColor   = HOME_TYPE_COLORS[house?.homeType] || COLOR_FALLBACK;
    const regionColor = REGION_COLORS[house?.region]      || COLOR_FALLBACK;

    const supervisorNames = supervisors.length > 0
        ? supervisors.map((s) => resolveName(s)).filter(Boolean).join("  ·  ")
        : null;

    const supervisorStatus = review?.supervisorStatus ?? "pending";
    const payrollStatus    = review?.payrollStatus    ?? "pending";
    const supervisorTone   = SUPERVISOR_TONE[supervisorStatus] ?? "neutral";
    const payrollTone      = PAYROLL_TONE[payrollStatus]       ?? "neutral";

    const periodLabel = payPeriod
        ? `${payPeriod.payYear}  ·  Period ${payPeriod.periodNumber}`
        : payYear && periodNumber
        ? `${payYear}  ·  Period ${periodNumber}`
        : null;

    const backHref = `/payroll/${homeId}?payYear=${payYear}&periodNumber=${periodNumber}`;

    return (
        <PageLayout>
            <div className={styles.pageContainer}>

                {/* ── Page header ──────────────────────────────────────────── */}
                <div className={styles.pageHeader}>
                    <div className={styles.titleBlock}>
                        <h1>{isCommunityRow ? "Other Hours — Review History" : "Review History"}</h1>
                        <div className={styles.titleMeta}>
                            {periodLabel && (
                                <span className={styles.periodBadge}>{periodLabel}</span>
                            )}
                            {review?.reviewDueAt && (
                                <span className={styles.dueBadge}>
                                    <CalendarClock size={11} />
                                    Due {formatDateTime(review.reviewDueAt)}
                                </span>
                            )}
                            {review?.isOverdue && (
                                <span className={styles.overdueBadge}>
                                    <AlertTriangle size={11} />
                                    Overdue
                                </span>
                            )}
                        </div>
                    </div>
                    <Button variant="secondary" icon={<Undo2 size={15} />} onClick={() => router.push(backHref)}>
                        Back
                    </Button>
                </div>

                <ErrorState isLoading={isLoading} errorMessage={fetchError} onRetry={refetch} />

                {!isLoading && !fetchError && (
                    <>
                        {/* ── House card ───────────────────────────────────── */}
                        <div className={styles.houseCard}>
                            <div
                                className={styles.houseCardIcon}
                                style={{ background: isCommunityRow ? "#f1f5f9" : typeColor.bg }}
                            >
                                <Building2 size={20} style={{ color: isCommunityRow ? "#94a3b8" : typeColor.border }} />
                            </div>
                            <div className={styles.houseCardBody}>
                                <h2 className={styles.houseCardName}>
                                    {isCommunityRow ? "Other Hours" : (house?.name ?? "—")}
                                </h2>
                                <div className={styles.houseCardMeta}>
                                    {!isCommunityRow && house?.homeType && <ColorPill label={house.homeType} color={typeColor} />}
                                    {!isCommunityRow && house?.region   && <ColorPill label={house.region}   color={regionColor} />}
                                    {!isCommunityRow && !house?.isActive && (
                                        <span className={styles.inactiveTag}>Inactive</span>
                                    )}
                                    {isCommunityRow && (
                                        <span style={{ fontSize: "0.82rem", color: "#94a3b8" }}>
                                            Hours not assigned to any specific home
                                        </span>
                                    )}
                                </div>
                                {supervisors.length > 0 && (
                                    <div className={styles.supervisorsLine}>
                                        <Users size={12} className={styles.supervisorsIcon} />
                                        <span>{supervisorNames}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* ── Activity strip ───────────────────────────────── */}
                        <div className={styles.activityStrip}>
                            <div className={styles.activityItem}>
                                <span className={styles.activityNum}>{activity?.staffCount ?? "—"}</span>
                                <span className={styles.activityLabel}>Staff</span>
                            </div>
                            <div className={styles.activityDivider} />
                            <div className={styles.activityItem}>
                                <span className={styles.activityNum}>
                                    {activity?.totalHours != null ? Number(activity.totalHours).toFixed(1) : "—"}
                                </span>
                                <span className={styles.activityLabel}>Total Hours</span>
                            </div>
                            <div className={styles.activityDivider} />
                            <div className={`${styles.activityItem} ${(activity?.unresolvedHours ?? 0) > 0 ? styles.activityItemWarn : ""}`}>
                                <span className={styles.activityNum}>
                                    {activity?.unresolvedHours != null ? Number(activity.unresolvedHours).toFixed(1) : "—"}
                                </span>
                                <span className={styles.activityLabel}>Unresolved</span>
                            </div>
                            <div className={styles.activityDivider} />
                            <div className={`${styles.activityItem} ${activity?.hasActivity ? styles.activityItemActive : ""}`}>
                                <Activity size={16} className={styles.activityIcon} />
                                <span className={styles.activityLabel}>{activity?.hasActivity ? "Has Activity" : "No Activity"}</span>
                            </div>
                        </div>

                        {/* ── Current status ───────────────────────────────── */}
                        <div className={styles.section}>
                            <h2 className={styles.sectionTitle}>Current Status</h2>
                            <div className={styles.statusPanels}>

                                {/* Supervisor panel */}
                                <div className={styles.statusPanel} style={{ "--panel-accent": TONE_ACCENT[supervisorTone] }}>
                                    <div className={styles.panelHeader}>
                                        <span className={styles.panelTitle}>Supervisor Review</span>
                                        <StatusBadge
                                            label={SUPERVISOR_LABEL[supervisorStatus] ?? supervisorStatus}
                                            tone={supervisorTone}
                                            size="tag"
                                        />
                                    </div>
                                    <div className={styles.panelBody}>
                                        <DetailRow label="Reviewed by" value={<PersonPill name={resolveName(review?.supervisorReviewedBy)} />} />
                                        <DetailRow label="Reviewed at" value={review?.supervisorReviewedAt ? formatDateTime(review.supervisorReviewedAt) : null} />
                                        <DetailRow label="Note"        value={review?.supervisorNote} />
                                    </div>
                                </div>

                                {/* Payroll panel */}
                                <div className={styles.statusPanel} style={{ "--panel-accent": TONE_ACCENT[payrollTone] }}>
                                    <div className={styles.panelHeader}>
                                        <span className={styles.panelTitle}>Payroll Status</span>
                                        <StatusBadge
                                            label={PAYROLL_LABEL[payrollStatus] ?? payrollStatus}
                                            tone={payrollTone}
                                            size="tag"
                                        />
                                    </div>
                                    <div className={styles.panelBody}>
                                        <DetailRow label="Updated by" value={<PersonPill name={resolveName(review?.payrollStatusBy)} />} />
                                        <DetailRow label="Updated at" value={review?.payrollStatusAt ? formatDateTime(review.payrollStatusAt) : null} />
                                        <DetailRow label="Note"       value={review?.payrollNote} />
                                    </div>
                                </div>

                            </div>
                        </div>

                        {/* ── Additional review fields ──────────────────────── */}
                        <div className={styles.section}>
                            <h2 className={styles.sectionTitle}>Review Details</h2>
                            <div className={styles.detailGrid}>
                                <DetailRow label="Record exists"     value={review?.exists ? "Yes" : review?.exists === false ? "No" : null} />
                                <DetailRow label="Review due"        value={review?.reviewDueAt     ? formatDateTime(review.reviewDueAt)     : null} />
                                <DetailRow label="Overdue"           value={review?.isOverdue === true ? "Yes" : review?.isOverdue === false ? "No" : null} />
                                <DetailRow label="Notice sent"       value={review?.overdueNotifiedAt ? formatDateTime(review.overdueNotifiedAt) : null} />
                            </div>
                        </div>

                        {/* ── Audit trail ───────────────────────────────────── */}
                        <div className={styles.section}>
                            <h2 className={styles.sectionTitle}>
                                Audit Trail
                                <span className={styles.historyCount}>{history.length} event{history.length !== 1 ? "s" : ""}</span>
                            </h2>

                            {history.length === 0 ? (
                                <div className={styles.emptyTimeline}>
                                    <Clock size={28} />
                                    <p>No changes recorded yet.</p>
                                </div>
                            ) : (
                                <div className={styles.timeline}>
                                    {[...history].reverse().map((event, index) => (
                                        <div key={index} className={styles.timelineItem}>
                                            <div className={`${styles.timelineMarker} ${event.flag === "supervisor" ? styles.markerSupervisor : styles.markerPayroll}`} />
                                            <div className={styles.timelineContent}>
                                                <div className={styles.timelineHeader}>
                                                    <span className={`${styles.timelineFlag} ${event.flag === "supervisor" ? styles.flagSupervisor : styles.flagPayroll}`}>
                                                        {FLAG_LABEL[event.flag] ?? event.flag}
                                                    </span>
                                                    <span className={styles.timelineAt}>
                                                        <Clock size={11} />
                                                        {event.at ? formatDateTime(event.at) : "—"}
                                                    </span>
                                                </div>
                                                <div className={styles.timelineTransition}>
                                                    <StatusBadge
                                                        label={statusLabel(event.flag, event.from)}
                                                        tone={statusTone(event.flag, event.from)}
                                                        size="tag"
                                                    />
                                                    <ArrowRight size={13} className={styles.transitionArrow} />
                                                    <StatusBadge
                                                        label={statusLabel(event.flag, event.to)}
                                                        tone={statusTone(event.flag, event.to)}
                                                        size="tag"
                                                    />
                                                    {event.by && (
                                                        <PersonPill name={resolveName(event.by) ?? "Unknown"} />
                                                    )}
                                                </div>
                                                {event.reason && (
                                                    <div className={styles.timelineReason}>
                                                        <span className={styles.timelineReasonLabel}>Reason</span>
                                                        {event.reason}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </PageLayout>
    );
}
