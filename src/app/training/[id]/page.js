"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import PageLayout from "@components/layout/PageLayout";
import ErrorState from "@components/UI/ErrorState";
import Button from "@components/UI/Button";
import ConfirmDeleteModal from "@components/UI/ConfirmDeleteModal";
import GeofenceMap from "@components/UI/GeofenceMap";
import StatusBadge, { ColorPill } from "@components/UI/Badge";
import { Card, CardHeader, CardContent, InfoField } from "@components/UI/Card";
import { useTrainings } from "@/hooks/useTrainings";
import { useProfile } from "@/hooks/useProfile";
import { formatDateTime } from "@/utils/dates";
import { personName, getLabel } from "@/utils/formatting";
import { CERTIFICATE_OPTIONS } from "@/utils/dropdownList/certificate";
import PersonName from "../_components/PersonName";
import AttendeeRoster from "../_components/AttendeeRoster";
import AttendeeStatusModal from "../_components/AttendeeStatusModal";
import AttendanceOverrideModal from "../_components/AttendanceOverrideModal";
import BulkAttendanceModal from "../_components/BulkAttendanceModal";
import AddAttendeesModal from "../_components/AddAttendeesModal";
import CancelTrainingModal from "../_components/CancelTrainingModal";
import { TRAINING_STATUS_META, SESSION_STATE_META } from "../_components/statusMeta";
import { getTrainingTypeColor } from "@/utils/dropdownList/trainingType";
import {
    Edit, Ban, AlertCircle, UserPlus, LogIn, LogOut,
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

function PayRuleRow({ rule }) {
    const accent = RULE_ACCENT[rule.employmentStatus] ?? "#d1d5db";
    return (
        <div className={styles.ruleRow} style={{ borderLeftColor: accent }}>
            <span className={styles.ruleRowType}>{EMPLOYMENT_STATUS_LABEL[rule.employmentStatus] ?? rule.employmentStatus}</span>
            <span className={styles.ruleRowMode}>{PAY_MODE_LABEL[rule.payMode] ?? rule.payMode}</span>
            {rule.payMode === "fixed_hours" && rule.fixedHours != null && (
                <span className={styles.ruleRowHours}>{rule.fixedHours}h</span>
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

    // Attendance override has no permission axis of its own — the backend folded
    // it into manage_trainings (see trainingService.js doc comment). Kept as a
    // named alias so the roster's attendance-only actions stay readable.
    const canManageAttendance = canManage;

    const [confirmCancel, setConfirmCancel]           = useState(false);
    const [showAddAttendees, setShowAddAttendees]     = useState(false);
    const [showBulkClockIn, setShowBulkClockIn]       = useState(false);
    const [showBulkClockOut, setShowBulkClockOut]     = useState(false);
    const [statusTarget, setStatusTarget]             = useState(null);
    const [attendanceTarget, setAttendanceTarget]     = useState(null);
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
                                {training.sessionState && (
                                    <StatusBadge
                                        label={SESSION_STATE_META[training.sessionState]?.label || training.sessionState}
                                        tone={SESSION_STATE_META[training.sessionState]?.tone}
                                        size="detail"
                                    />
                                )}
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

                        <div className={styles.topRow}>
                            <Card className={styles.leftCard}>
                                <CardHeader>Training Details</CardHeader>
                                <CardContent>
                                    <div className={styles.infoGrid3}>
                                        <InfoField label="Type">
                                            <ColorPill label={training.trainingTypeLabel || training.trainingType} color={getTrainingTypeColor(training.trainingType)} />
                                        </InfoField>
                                        <InfoField label="Start" value={formatDateTime(training.startTime)} />
                                        <InfoField label="End" value={formatDateTime(training.endTime)} />
                                    </div>

                                    <p className={styles.sectionDivider}>Trainers</p>
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

                                    <p className={styles.sectionDivider}>Certificate</p>
                                    {training.generatesCertificate ? (
                                        <div className={styles.infoGrid}>
                                            <InfoField label="Certification Type" value={getLabel(CERTIFICATE_OPTIONS, training.certificationType)} />
                                            <InfoField
                                                label="Validity"
                                                value={training.certificateValidityMonths ? `${training.certificateValidityMonths} months` : "Default (100 years)"}
                                            />
                                        </div>
                                    ) : (
                                        <p className={styles.emptyNote}>Does not generate a certificate.</p>
                                    )}

                                    <p className={styles.sectionDivider}>Pay Rules</p>
                                    {!training.payRules || training.payRules.length === 0 ? (
                                        <p className={styles.emptyNote}>No pay rules configured — no employment type is paid.</p>
                                    ) : (
                                        <div className={styles.rulesViewList}>
                                            {training.payRules.map((rule, index) => (
                                                <PayRuleRow key={index} rule={rule} />
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            <Card className={styles.rightCard}>
                                <CardHeader>Site</CardHeader>
                                <CardContent>
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
                                                height="260px"
                                            />
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        <Card>
                            <CardHeader
                                actions={canManage && training.status !== "cancelled" && (
                                    <div className={styles.attendeeActions}>
                                        {canManageAttendance && (
                                            <>
                                                <Button icon={<LogIn size={15} />} variant="secondary" onClick={() => setShowBulkClockIn(true)}>
                                                    Clock In
                                                </Button>
                                                <Button icon={<LogOut size={15} />} variant="secondary" onClick={() => setShowBulkClockOut(true)}>
                                                    Clock Out
                                                </Button>
                                            </>
                                        )}
                                        {canManage && (
                                            <Button icon={<UserPlus size={15} />} variant="secondary" onClick={() => setShowAddAttendees(true)}>
                                                Add Attendees
                                            </Button>
                                        )}
                                    </div>
                                )}
                            >
                                Attendees
                            </CardHeader>
                            <CardContent>
                                {training.attendanceSummary && (
                                    <div className={styles.attendanceSummaryStrip}>
                                        <div className={styles.attendanceSummaryItem}>
                                            <span className={styles.attendanceSummaryNum}>{training.attendanceSummary.total}</span>
                                            <span className={styles.attendanceSummaryLabel}>Total</span>
                                        </div>
                                        <div className={styles.attendanceSummaryItem}>
                                            <span className={styles.attendanceSummaryNum}>{training.attendanceSummary.notClockedIn}</span>
                                            <span className={styles.attendanceSummaryLabel}>Not Clocked In</span>
                                        </div>
                                        <div className={styles.attendanceSummaryItem}>
                                            <span className={styles.attendanceSummaryNum}>{training.attendanceSummary.inProgress}</span>
                                            <span className={styles.attendanceSummaryLabel}>In Progress</span>
                                        </div>
                                        <div className={styles.attendanceSummaryItem}>
                                            <span className={styles.attendanceSummaryNum}>{training.attendanceSummary.clockedOut}</span>
                                            <span className={styles.attendanceSummaryLabel}>Clocked Out</span>
                                        </div>
                                    </div>
                                )}
                                <AttendeeRoster
                                    attendees={training.attendees}
                                    canManage={canManage && training.status !== "cancelled"}
                                    canManageAttendance={canManageAttendance && training.status !== "cancelled"}
                                    onStatusClick={setStatusTarget}
                                    onAttendanceClick={setAttendanceTarget}
                                    onRemove={(caregiverId) => {
                                        const attendee = training.attendees.find((a) => (a.caregiver?._id || a.caregiver?.id || a.caregiver) === caregiverId);
                                        setRemoveTarget(attendee || { caregiver: caregiverId });
                                    }}
                                    isActionPending={isActionPending}
                                />
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

                    <AttendanceOverrideModal
                        isOpen={!!attendanceTarget}
                        onClose={() => setAttendanceTarget(null)}
                        trainingId={id}
                        attendee={attendanceTarget}
                    />

                    <BulkAttendanceModal
                        isOpen={showBulkClockIn}
                        onClose={() => setShowBulkClockIn(false)}
                        trainingId={id}
                        attendees={training.attendees}
                        mode="clock-in"
                    />

                    <BulkAttendanceModal
                        isOpen={showBulkClockOut}
                        onClose={() => setShowBulkClockOut(false)}
                        trainingId={id}
                        attendees={training.attendees}
                        mode="clock-out"
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
