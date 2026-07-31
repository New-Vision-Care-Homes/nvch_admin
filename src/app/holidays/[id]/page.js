"use client";

import { useState }             from "react";
import { useParams, useRouter } from "next/navigation";
import PageLayout               from "@components/layout/PageLayout";
import ErrorState               from "@components/UI/ErrorState";
import Button                   from "@components/UI/Button";
import ConfirmDeleteModal        from "@components/UI/ConfirmDeleteModal";
import StatusBadge, { ColorPill } from "@components/UI/Badge";
import { Card, CardHeader, CardContent, InfoField } from "@components/UI/Card";
import { useHolidays }          from "@/hooks/useHolidays";
import { useAdmins }            from "@/hooks/useAdmins";
import { useProfile }           from "@/hooks/useProfile";
import { formatDateOnly, formatDateTime } from "@/utils/dates";
import { personName }           from "@/utils/formatting";
import { ADMIN_LEVEL_LABEL, ADMIN_LEVEL_COLORS } from "@/utils/dropdownList/adminLevel";
import { COLOR_FALLBACK } from "@/utils/dropdownList/shared";
import {
    Edit, Trash2, Undo2, AlertCircle,
    UserCheck, CalendarDays, Clock,
} from "lucide-react";
import styles from "./detail.module.css";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const EMPLOYMENT_STATUS_LABEL = { full_time: "Full-time", casual: "Casual", term: "Term" };
const QUALIFICATION_LABEL = {
    automatic:          "Automatic",
    min_biweekly_hours: "Min biweekly hours",
    paid_days_bracket:  "Paid-days bracket (30-day)",
};
const RULE_ACCENT = { full_time: "#1c4a6e", casual: "#d97706", term: "#64748b" };

function AdminName({ adminId }) {
    const { adminDetail } = useAdmins(adminId || "");
    if (!adminId)     return "—";
    if (!adminDetail) return adminId;
    return personName(adminDetail);
}


function AdminLevelChip({ level }) {
    const label = ADMIN_LEVEL_LABEL[level] ?? level;
    return <ColorPill label={label} color={ADMIN_LEVEL_COLORS[level] ?? COLOR_FALLBACK} />;
}

function RuleViewCard({ rule }) {
    const accent = RULE_ACCENT[rule.employmentStatus] ?? "#d1d5db";
    return (
        <div className={styles.ruleViewCard} style={{ borderLeftColor: accent }}>
            <div className={styles.ruleViewRow}>
                <span className={styles.ruleViewLabel}>Employment Type</span>
                <span className={styles.ruleViewValue}>{EMPLOYMENT_STATUS_LABEL[rule.employmentStatus] ?? rule.employmentStatus}</span>
            </div>
            <div className={styles.ruleViewRow}>
                <span className={styles.ruleViewLabel}>Qualification</span>
                <span className={styles.ruleViewValue}>{QUALIFICATION_LABEL[rule.qualification] ?? rule.qualification}</span>
            </div>
            {rule.qualification === "min_biweekly_hours" && rule.minBiweeklyHours != null && (
                <div className={styles.ruleViewRow}>
                    <span className={styles.ruleViewLabel}>Min Biweekly Hours</span>
                    <span className={styles.ruleViewValue}>{rule.minBiweeklyHours} h</span>
                </div>
            )}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default function HolidayDetailPage() {
    const { id } = useParams();
    const router  = useRouter();

    const { profile } = useProfile();
    const slugs      = profile?.permissionSlugs ?? [];
    const canManage  = slugs.includes("manage_holidays");

    const { holiday, isLoading, fetchError, refetch, deleteHoliday, isActionPending, actionError } = useHolidays(id);

    const [confirmDelete, setConfirmDelete] = useState(false);

    const handleDelete = () =>
        deleteHoliday(id, { onSuccess: () => router.push("/holidays") });

    return (
        <PageLayout>

            <ErrorState isLoading={isLoading} errorMessage={fetchError} onRetry={refetch} />

            {!isLoading && !fetchError && holiday && (
                <>
                    {/* ═══════════════════════════════════ HEADER */}
                    <div className={styles.pageHeader}>
                        <div>
                            <div className={styles.badgeRow}>
                                <StatusBadge
                                    label={holiday.isActive ? "Active" : "Inactive"}
                                    tone={holiday.isActive ? "success" : "neutral"}
                                    size="detail"
                                />
                            </div>
                            <h1>{holiday.name}</h1>
                            <div className={styles.metaRow}>
                                {holiday.createdBy && (
                                    <>
                                        <UserCheck size={13} />
                                        <span>Created by <strong><AdminName adminId={holiday.createdBy} /></strong></span>
                                    </>
                                )}
                                {holiday.createdAt && (
                                    <>
                                        <span className={styles.metaSep}>·</span>
                                        <CalendarDays size={13} />
                                        <span>Created <strong>{formatDateTime(holiday.createdAt)}</strong></span>
                                    </>
                                )}
                                {holiday.updatedAt && (
                                    <>
                                        <span className={styles.metaSep}>·</span>
                                        <Clock size={13} />
                                        <span>Updated <strong>{formatDateTime(holiday.updatedAt)}</strong></span>
                                    </>
                                )}
                            </div>
                        </div>
                        <div className={styles.headerActions}>
                            <Button icon={<Undo2 size={16} />} variant="secondary" onClick={() => router.push("/holidays")}>
                                Back
                            </Button>
                            {canManage && (
                                <>
                                    <Button icon={<Edit size={16} />} variant="primary" onClick={() => router.push(`/holidays/${id}/edit`)}>
                                        Edit
                                    </Button>
                                    <Button icon={<Trash2 size={16} />} variant="danger" onClick={() => setConfirmDelete(true)}>
                                        Delete
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>

                    {/* ═══════════════════════════════════ DELETE MODAL */}
                    <ConfirmDeleteModal
                        isOpen={confirmDelete}
                        onClose={() => setConfirmDelete(false)}
                        onConfirm={handleDelete}
                        itemName={holiday.name}
                        isLoading={isActionPending}
                    />

                    {/* ═══════════════════════════════════ ACTION ERROR */}
                    {actionError && (
                        <div className={styles.errorBanner}>
                            <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                            {actionError}
                        </div>
                    )}

                    {/* ═══════════════════════════════════ CARDS */}
                    <div className={styles.mainRow}>

                        {/* Card 1 — Holiday Info */}
                        <div className={styles.colLeft}>
                            <Card>
                                <CardHeader>
                                    <span className={styles.cardTitleInner}>Holiday Info</span>
                                </CardHeader>
                                <CardContent>
                                    <div className={styles.infoGrid}>
                                        <InfoField label="Name"    value={holiday.name} />
                                        <InfoField label="Date"    value={formatDateOnly(holiday.date)} />
                                        <InfoField label="Pay Method">
                                            {holiday.proratedToWorkedHours
                                                ? <span className={styles.proratedLabel}>Prorated to worked hours</span>
                                                : <span className={styles.fixedLabel}>Fixed · {holiday.grantHours ?? 12} h</span>
                                            }
                                        </InfoField>
                                        {!holiday.proratedToWorkedHours && (
                                            <InfoField label="Grant Hours" value={`${holiday.grantHours ?? 12} h`} />
                                        )}
                                        <InfoField label="Admin Levels">
                                            {!holiday.adminLevels || holiday.adminLevels.length === 0
                                                ? <span className={styles.emptyNote}>None</span>
                                                : (
                                                    <div className={styles.chipRow}>
                                                        {holiday.adminLevels.map((level) => (
                                                            <AdminLevelChip key={level} level={level} />
                                                        ))}
                                                    </div>
                                                )
                                            }
                                        </InfoField>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Card 2 — Caregiver Rules */}
                        <div className={styles.colRight}>
                            <Card>
                                <CardHeader>
                                    <span className={styles.cardTitleInner}>Caregiver Rules</span>
                                </CardHeader>
                                <CardContent>
                                    {!holiday.caregiverRules || holiday.caregiverRules.length === 0 ? (
                                        <p className={styles.emptyNote}>No rules configured.</p>
                                    ) : (
                                        <div className={styles.rulesViewList}>
                                            {holiday.caregiverRules.map((rule, index) => (
                                                <RuleViewCard key={index} rule={rule} />
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                    </div>
                </>
            )}

        </PageLayout>
    );
}
