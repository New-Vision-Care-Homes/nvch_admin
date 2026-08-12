"use client";

import Link from "next/link";
import { Table, TableHeader, TableContent, TableCell } from "@components/UI/Table";
import StatusBadge from "@components/UI/Badge";
import IconButton from "@components/UI/IconButton";
import { Pencil, Trash2, Timer, AlertTriangle } from "lucide-react";
import { formatDateOnly, formatDateTime } from "@/utils/dates";
import { ATTENDEE_STATUS_META, ATTENDANCE_STATE_LABEL } from "./statusMeta";
import PersonName from "./PersonName";
import styles from "./AttendeeRoster.module.css";

// Time-only (Atlantic Time) — the roster is scoped to a single training day,
// so repeating the full date on every row would just be noise.
function formatTimeOnly(iso) {
    if (!iso) return null;
    try {
        return new Date(iso).toLocaleTimeString("en-CA", {
            hour: "2-digit", minute: "2-digit", timeZone: "America/Halifax",
        });
    } catch {
        return null;
    }
}

function AttendanceCell({ attendance }) {
    const state = attendance?.state || "not_clocked_in";
    const flags = attendance?.flags ?? [];
    const flagTitle = flags.length > 0 ? flags.join(", ") : undefined;

    if (state === "not_clocked_in") {
        return <span className={styles.emptyNote}>{ATTENDANCE_STATE_LABEL[state]}</span>;
    }

    const inTime  = formatTimeOnly(attendance?.clockInAt);
    const outTime = formatTimeOnly(attendance?.clockOutAt);

    return (
        <span className={styles.attendanceCell} title={flagTitle}>
            {state === "in_progress" ? (
                <span className={styles.attendanceInProgress}>In progress · in {inTime}</span>
            ) : (
                <>
                    {inTime} → {outTime}
                    {attendance?.clockedHours != null && (
                        <span className={styles.attendanceHours}> ({attendance.clockedHours}h)</span>
                    )}
                </>
            )}
            {flags.length > 0 && <AlertTriangle size={12} className={styles.attendanceFlagIcon} />}
        </span>
    );
}

/**
 * Attendee roster table for the training detail page.
 *
 * @param {object[]}  attendees            - training.attendees
 * @param {boolean}   canManage            - Whether status-change / remove actions are shown
 * @param {boolean}   canManageAttendance  - Whether the "Fix attendance" action is shown
 * @param {Function}  onStatusClick        - (attendee) => void — opens the status modal
 * @param {Function}  onAttendanceClick    - (attendee) => void — opens the attendance-fix modal
 * @param {Function}  onRemove             - (caregiverId) => void
 * @param {boolean}   isActionPending      - Disables row actions while a mutation is in flight
 */
export default function AttendeeRoster({
    attendees, canManage, canManageAttendance = false,
    onStatusClick, onAttendanceClick, onRemove, isActionPending,
}) {
    if (!attendees || attendees.length === 0) {
        return <p className={styles.emptyNote}>No attendees added yet.</p>;
    }

    const showActions = canManage || canManageAttendance;

    return (
        <Table>
            <TableHeader>
                <TableCell className={styles.colName}>Caregiver</TableCell>
                <TableCell className={styles.colStatus}>Status</TableCell>
                <TableCell className={styles.colAttendance}>Attendance</TableCell>
                <TableCell className={styles.colNotes}>Notes</TableCell>
                <TableCell className={styles.colDate}>Retake Date/Certificate</TableCell>
                <TableCell className={styles.colDecided}>Decided</TableCell>
                {showActions && <TableCell className={styles.colActions}>Actions</TableCell>}
            </TableHeader>

            {attendees.map((attendee) => (
                <TableContent key={attendee.caregiver?._id || attendee.caregiver?.id || attendee.caregiver}>
                    <TableCell className={styles.colName}>
                        <PersonName role="caregiver" person={attendee.caregiver} />
                    </TableCell>
                    <TableCell className={styles.colStatus}>
                        <StatusBadge
                            label={ATTENDEE_STATUS_META[attendee.status]?.label || attendee.status}
                            tone={ATTENDEE_STATUS_META[attendee.status]?.tone}
                        />
                    </TableCell>
                    <TableCell className={styles.colAttendance}>
                        <AttendanceCell attendance={attendee.attendance} />
                    </TableCell>
                    <TableCell className={styles.colNotes}>
                        {attendee.notes || <span className={styles.emptyNote}>—</span>}
                    </TableCell>
                    <TableCell className={styles.colDate}>
                        {attendee.status === "retake" ? (
                            formatDateOnly(attendee.retakeDate)
                        ) : attendee.status === "completed" && attendee.certificateApprovalId ? (
                            <Link href={`/approvals/${attendee.certificateApprovalId}`} className={styles.certPendingLink}>
                                Approve Certificate →
                            </Link>
                        ) : (
                            "—"
                        )}
                    </TableCell>
                    <TableCell className={styles.colDecided}>
                        {attendee.decidedAt ? (
                            <span className={styles.decidedNote}>
                                <PersonName role="admin" person={attendee.decidedBy} /> · {formatDateTime(attendee.decidedAt)}
                            </span>
                        ) : (
                            <span className={styles.emptyNote}>—</span>
                        )}
                    </TableCell>
                    {showActions && (
                        <TableCell className={styles.colActions}>
                            <div className={styles.actionsRow}>
                                {canManage && (
                                    <IconButton
                                        title="Set status"
                                        onClick={() => onStatusClick(attendee)}
                                        disabled={isActionPending}
                                    >
                                        <Pencil size={15} />
                                    </IconButton>
                                )}
                                {canManageAttendance && (
                                    <IconButton
                                        title="Fix attendance"
                                        onClick={() => onAttendanceClick(attendee)}
                                        disabled={isActionPending}
                                    >
                                        <Timer size={15} />
                                    </IconButton>
                                )}
                                {canManage && (
                                    <IconButton
                                        variant="danger"
                                        title="Remove attendee"
                                        onClick={() => onRemove(attendee.caregiver?._id || attendee.caregiver?.id || attendee.caregiver)}
                                        disabled={isActionPending}
                                    >
                                        <Trash2 size={15} />
                                    </IconButton>
                                )}
                            </div>
                        </TableCell>
                    )}
                </TableContent>
            ))}
        </Table>
    );
}
