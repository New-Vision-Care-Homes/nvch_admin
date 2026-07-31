"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import PageLayout from "@components/layout/PageLayout";
import ErrorState from "@components/UI/ErrorState";
import Button from "@components/UI/Button";
import ConfirmDeleteModal from "@components/UI/ConfirmDeleteModal";
import GeofenceMap from "@components/UI/GeofenceMap";
import StatusBadge from "@components/UI/StatusBadge";
import { Card, CardHeader, CardContent, InfoField } from "@components/UI/Card";
import { useTrainings } from "@/hooks/useTrainings";
import { useProfile } from "@/hooks/useProfile";
import { formatDateTime } from "@/utils/dates";
import { personName } from "@/utils/formatting";
import PersonName from "../_components/PersonName";
import AttendeeRoster from "../_components/AttendeeRoster";
import AttendeeStatusModal from "../_components/AttendeeStatusModal";
import AddAttendeesModal from "../_components/AddAttendeesModal";
import CancelTrainingModal from "../_components/CancelTrainingModal";
import { TRAINING_STATUS_META } from "../_components/statusMeta";
import {
    Edit, Ban, AlertCircle, UserPlus,
    UserCheck, CalendarDays, Clock, MapPin, Undo2,
} from "lucide-react";
import styles from "./detail.module.css";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const PAY_MODE_LABEL = {
    fixed_hours:  "Fixed hours",
    actual_hours: "Actual hours",
    unpaid:       "Unpaid",
};
const EMPLOYMENT_STATUS_LABEL = { full_time: "Full-time", casual: "Casual", term: "Term" };
const RULE_ACCENT = { full_time: "#1c4a6e", casual: "#d97706", term: "#64748b" };

function PayRuleCard({ rule }) {
    const accent = RULE_ACCENT[rule.employmentStatus] ?? "#d1d5db";
    return (
        <div className={styles.ruleViewCard} style={{ borderLeftColor: accent }}>
            <div className={styles.ruleViewRow}>
                <span className={styles.ruleViewLabel}>Employment Type</span>
                <span className={styles.ruleViewValue}>{EMPLOYMENT_STATUS_LABEL[rule.employmentStatus] ?? rule.employmentStatus}</span>
            </div>
            <div className={styles.ruleViewRow}>
                <span className={styles.ruleViewLabel}>Pay Mode</span>
                <span className={styles.ruleViewValue}>{PAY_MODE_LABEL[rule.payMode] ?? rule.payMode}</span>
            </div>
            {rule.payMode === "fixed_hours" && rule.fixedHours != null && (
                <div className={styles.ruleViewRow}>
                    <span className={styles.ruleViewLabel}>Fixed Hours</span>
                    <span className={styles.ruleViewValue}>{rule.fixedHours} h</span>
                </div>
            )}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default function TrainingDetailPage() {
    const { id } = useParams();
    const router = useRouter();

    const { profile } = useProfile();
    const slugs     = profile?.permissionSlugs ?? [];
    const canManage = slugs.includes("manage_trainings");

    const { training, isLoading, fetchError, refetch, removeAttendee, isActionPending, actionError } = useTrainings(id);

    const [confirmCancel, setConfirmCancel]           = useState(false);
    const [showAddAttendees, setShowAddAttendees]     = useState(false);
    const [statusTarget, setStatusTarget]             = useState(null);
    const [removeTarget, setRemoveTarget]             = useState(null);

    const handleRemoveConfirm = () => {
        if (!removeTarget) return;
        const caregiverId = removeTarget.caregiver?._id || removeTarget.caregiver?.id || removeTarget.caregiver;
        removeAttendee({ id, caregiverId }, { onSuccess: () => setRemoveTarget(null) });
    };

    const removeTargetName = removeTarget
        ? `attendee ${typeof removeTarget.caregiver === "object" ? personName(removeTarget.caregiver) : ""}`.trim()
        : "";

    return (
        <PageLayout>

            <ErrorState isLoading={isLoading} errorMessage={fetchError} onRetry={refetch} />

            {!isLoading && !fetchError && training && (
                <>
                    {/* ═══════════════════════════════════ HEADER */}
                    <div className={styles.pageHeader}>
                        <div>
                            <div className={styles.badgeRow}>
                                <StatusBadge
                                    label={TRAINING_STATUS_META[training.status]?.label || training.status}
                                    tone={TRAINING_STATUS_META[training.status]?.tone}
                                    size="detail"
                                />
                            </div>
                            <h1>{training.title}</h1>
                            <div className={styles.metaRow}>
                                {training.createdBy && (
                                    <>
                                        <UserCheck size={13} />
                                        <span>Created by <strong><PersonName role="admin" person={training.createdBy} /></strong></span>
                                    </>
                                )}
                                {training.createdAt && (
                                    <>
                                        <span className={styles.metaSep}>·</span>
                                        <CalendarDays size={13} />
                                        <span>Created <strong>{formatDateTime(training.createdAt)}</strong></span>
                                    </>
                                )}
                                {training.updatedAt && (
                                    <>
                                        <span className={styles.metaSep}>·</span>
                                        <Clock size={13} />
                                        <span>Updated <strong>{formatDateTime(training.updatedAt)}</strong></span>
                                    </>
                                )}
                            </div>
                        </div>
                        <div className={styles.headerActions}>
                            <Button variant="secondary" icon={<Undo2 size={16} />} onClick={() => router.push("/training")}>
                                Back
                            </Button>
                            {canManage && training.status !== "cancelled" && (
                                <>
                                    <Button icon={<Edit size={16} />} variant="primary" onClick={() => router.push(`/training/${id}/edit`)}>
                                        Edit
                                    </Button>
                                    <Button icon={<Ban size={16} />} variant="danger" onClick={() => setConfirmCancel(true)}>
                                        Cancel Training
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>

                    {/* ═══════════════════════════════════ ACTION ERROR */}
                    {actionError && (
                        <div className={styles.errorBanner}>
                            <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                            {actionError}
                        </div>
                    )}

                    {/* ═══════════════════════════════════ CARDS */}
                    <div className={styles.content}>

                        <Card>
                            <CardHeader>Basic Info</CardHeader>
                            <CardContent>
                                <div className={styles.infoGrid}>
                                    <InfoField label="Type" value={training.trainingType} />
                                </div>

                                <p className={styles.sectionDivider}>Schedule</p>
                                <div className={styles.infoGrid}>
                                    <InfoField label="Start" value={formatDateTime(training.startTime)} />
                                    <InfoField label="End" value={formatDateTime(training.endTime)} />
                                </div>

                                <p className={styles.sectionDivider}>Site</p>
                                <div className={styles.siteHeading}>
                                    <MapPin size={14} />
                                    <span>{training.site?.name}</span>
                                </div>
                                {training.site?.address && (
                                    <p className={styles.siteAddress}>{training.site.address}</p>
                                )}
                                {training.site?.geofence?.center && (
                                    <div className={styles.siteMapWrap}>
                                        <GeofenceMap
                                            center={training.site.geofence.center}
                                            radius={training.site.geofence.radius}
                                            height="280px"
                                        />
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>Trainers</CardHeader>
                            <CardContent>
                                {!training.trainers || training.trainers.length === 0 ? (
                                    <p className={styles.emptyNote}>No trainers assigned.</p>
                                ) : (
                                    <div className={styles.chipRow}>
                                        {training.trainers.map((trainer, i) => (
                                            <span key={trainer?._id || trainer?.id || trainer || i} className={styles.chip}>
                                                <PersonName role="admin" person={trainer} />
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader
                                actions={canManage && training.status !== "cancelled" && (
                                    <Button icon={<UserPlus size={15} />} variant="secondary" onClick={() => setShowAddAttendees(true)}>
                                        Add Attendees
                                    </Button>
                                )}
                            >
                                Attendees
                            </CardHeader>
                            <CardContent>
                                <AttendeeRoster
                                    attendees={training.attendees}
                                    canManage={canManage && training.status !== "cancelled"}
                                    onStatusClick={setStatusTarget}
                                    onRemove={(caregiverId) => {
                                        const attendee = training.attendees.find((a) => (a.caregiver?._id || a.caregiver?.id || a.caregiver) === caregiverId);
                                        setRemoveTarget(attendee || { caregiver: caregiverId });
                                    }}
                                    isActionPending={isActionPending}
                                />
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>Certificate</CardHeader>
                            <CardContent>
                                {training.generatesCertificate ? (
                                    <div className={styles.infoGrid}>
                                        <InfoField label="Certification Type" value={training.certificationType} />
                                        <InfoField
                                            label="Validity"
                                            value={training.certificateValidityMonths ? `${training.certificateValidityMonths} months` : "Default (100 years)"}
                                        />
                                    </div>
                                ) : (
                                    <p className={styles.emptyNote}>This training does not generate a certificate.</p>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>Pay Rules</CardHeader>
                            <CardContent>
                                {!training.payRules || training.payRules.length === 0 ? (
                                    <p className={styles.emptyNote}>No pay rules configured — no employment type is paid.</p>
                                ) : (
                                    <div className={styles.rulesViewList}>
                                        {training.payRules.map((rule, index) => (
                                            <PayRuleCard key={index} rule={rule} />
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                    </div>

                    {/* ═══════════════════════════════════ MODALS */}
                    <CancelTrainingModal
                        isOpen={confirmCancel}
                        onClose={() => setConfirmCancel(false)}
                        trainingId={id}
                        trainingTitle={training.title}
                        onSuccess={() => setConfirmCancel(false)}
                    />

                    <AddAttendeesModal
                        isOpen={showAddAttendees}
                        onClose={() => setShowAddAttendees(false)}
                        trainingId={id}
                    />

                    <AttendeeStatusModal
                        isOpen={!!statusTarget}
                        onClose={() => setStatusTarget(null)}
                        trainingId={id}
                        attendee={statusTarget}
                    />

                    <ConfirmDeleteModal
                        isOpen={!!removeTarget}
                        onClose={() => setRemoveTarget(null)}
                        onConfirm={handleRemoveConfirm}
                        itemName={removeTargetName}
                        isLoading={isActionPending}
                    />
                </>
            )}

        </PageLayout>
    );
}
