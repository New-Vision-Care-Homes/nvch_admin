"use client";

import { useState } from "react";
import Link from "next/link";
import { Table, TableHeader, TableContent, TableCell } from "@components/UI/Table";
import StatusBadge from "@components/UI/Badge";
import IconButton from "@components/UI/IconButton";
import { Pencil, Trash2, Timer, ChevronDown } from "lucide-react";
import { formatDateOnly, formatDateTime } from "@/utils/dates";
import { ATTENDEE_STATUS_META, ATTENDANCE_STATE_LABEL, ATTENDANCE_FLAG_META } from "./statusMeta";
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

/**
 * Explains what each small flag icon means. Only rendered when at least one
 * attendee currently has a flag — an empty/normal roster stays uncluttered.
 */
function FlagsLegend() {
    return (
        <div className={styles.flagsLegend}>
            <span className={styles.flagsLegendLabel}>Flags:</span>
            {Object.entries(ATTENDANCE_FLAG_META).map(([key, meta]) => {
                const Icon = meta.icon;
                return (
                    <span key={key} className={styles.flagsLegendItem} title={meta.description}>
                        <Icon size={13} style={{ color: meta.color }} />
                        {meta.label}
                    </span>
                );
            })}
        </div>
    );
}

/**
 * Compact attendance cell — state + flag icons + a chevron to expand the
 * full detail row below. There's no room in a table column for clock times,
 * hours, sources, and location/override info all at once, so only a summary
 * lives here; everything else lives in AttendanceDetailRow.
 */
function AttendanceSummary({ attendance, isExpanded, onToggle }) {
    const state = attendance?.state || "not_clocked_in";
    const flags = attendance?.flags ?? [];

    if (state === "not_clocked_in") {
        return <span className={styles.emptyNote}>{ATTENDANCE_STATE_LABEL[state]}</span>;
    }

    return (
        <button type="button" className={styles.attendanceSummaryBtn} onClick={onToggle}>
            <span className={state === "in_progress" ? styles.attendanceInProgress : undefined}>
                {ATTENDANCE_STATE_LABEL[state]}
            </span>
            {flags.length > 0 && (
                <span className={styles.attendanceFlags}>
                    {flags.map((flag) => {
                        const meta = ATTENDANCE_FLAG_META[flag];
                        if (!meta) return null;
                        const Icon = meta.icon;
                        return <Icon key={flag} size={13} style={{ color: meta.color }} />;
                    })}
                </span>
            )}
            <ChevronDown size={14} className={`${styles.attendanceChevron} ${isExpanded ? styles.attendanceChevronOpen : ""}`} />
        </button>
    );
}

/**
 * Full attendance detail — clock times, who recorded each side, hours,
 * labeled flags, and the last override — shown as a full-width panel below
 * the attendee's row (unconstrained by any table column width).
 */
function AttendanceDetailRow({ attendance }) {
    const inTime  = formatTimeOnly(attendance?.clockInAt);
    const outTime = formatTimeOnly(attendance?.clockOutAt);
    const flags   = attendance?.flags ?? [];

    const sourceLabel = (source) => (source === "supervisor" ? "by supervisor" : source === "caregiver" ? "by caregiver" : "");

    return (
        <div className={styles.attendanceDetailRow}>
            <div className={styles.attendanceDetailGrid}>
                <div className={styles.attendanceDetailItem}>
                    <span className={styles.attendanceDetailLabel}>Clock In</span>
                    <span className={styles.attendanceDetailValue}>
                        {inTime ? `${inTime} ${sourceLabel(attendance.clockInSource)}`.trim() : "—"}
                    </span>
                </div>
                <div className={styles.attendanceDetailItem}>
                    <span className={styles.attendanceDetailLabel}>Clock Out</span>
                    <span className={styles.attendanceDetailValue}>
                        {outTime ? `${outTime} ${sourceLabel(attendance.clockOutSource)}`.trim() : "—"}
                    </span>
                </div>
                <div className={styles.attendanceDetailItem}>
                    <span className={styles.attendanceDetailLabel}>Hours</span>
                    <span className={styles.attendanceDetailValue}>
                        {attendance?.clockedHours != null ? `${attendance.clockedHours}h` : "—"}
                    </span>
                </div>

                {flags.length > 0 && (
                    <div className={`${styles.attendanceDetailItem} ${styles.attendanceDetailFull}`}>
                        <span className={styles.attendanceDetailLabel}>Flags</span>
                        <div className={styles.attendanceDetailFlagsList}>
                            {flags.map((flag) => {
                                const meta = ATTENDANCE_FLAG_META[flag];
                                if (!meta) return null;
                                const Icon = meta.icon;
                                return (
                                    <span key={flag} className={styles.attendanceDetailFlagItem}>
                                        <Icon size={13} style={{ color: meta.color }} />
                                        {meta.label}
                                    </span>
                                );
                            })}
                        </div>
                    </div>
                )}

                {attendance?.overriddenBy && (
                    <div className={`${styles.attendanceDetailItem} ${styles.attendanceDetailFull}`}>
                        <span className={styles.attendanceDetailLabel}>Last Edited</span>
                        <span className={styles.attendanceDetailValue}>
                            <PersonName role="admin" person={attendance.overriddenBy} /> · {formatDateTime(attendance.overriddenAt)}
                            {attendance.overrideNote && ` — "${attendance.overrideNote}"`}
                        </span>
                    </div>
                )}
            </div>
        </div>
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
    const [expandedIds, setExpandedIds] = useState(() => new Set());

    if (!attendees || attendees.length === 0) {
        return <p className={styles.emptyNote}>No attendees added yet.</p>;
    }

    const showActions = canManage || canManageAttendance;
    const hasAnyFlags = attendees.some((a) => (a.attendance?.flags?.length ?? 0) > 0);

    const toggleExpanded = (caregiverId) => {
        setExpandedIds((prev) => {
            const next = new Set(prev);
            if (next.has(caregiverId)) next.delete(caregiverId); else next.add(caregiverId);
            return next;
        });
    };

    return (
        <>
            {hasAnyFlags && <FlagsLegend />}
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

                {attendees.map((attendee) => {
                    const caregiverId = attendee.caregiver?._id || attendee.caregiver?.id || attendee.caregiver;
                    const isExpanded = expandedIds.has(caregiverId);
                    return (
                        <div key={caregiverId}>
                            <TableContent>
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
                                    <AttendanceSummary
                                        attendance={attendee.attendance}
                                        isExpanded={isExpanded}
                                        onToggle={() => toggleExpanded(caregiverId)}
                                    />
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
                                                    onClick={() => onRemove(caregiverId)}
                                                    disabled={isActionPending}
                                                >
                                                    <Trash2 size={15} />
                                                </IconButton>
                                            )}
                                        </div>
                                    </TableCell>
                                )}
                            </TableContent>
                            {isExpanded && <AttendanceDetailRow attendance={attendee.attendance} />}
                        </div>
                    );
                })}
            </Table>
        </>
    );
}
