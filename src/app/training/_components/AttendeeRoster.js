"use client";

import { Table, TableHeader, TableContent, TableCell } from "@components/UI/Table";
import IconButton from "@components/UI/IconButton";
import { Pencil, Trash2 } from "lucide-react";
import { formatDateOnly, formatDateTime } from "@/utils/dates";
import PersonName from "./PersonName";
import styles from "./AttendeeRoster.module.css";

const STATUS_LABEL = {
    pending:   "Pending",
    attended:  "Attended",
    completed: "Completed",
    retake:    "Retake",
    failed:    "Failed",
};

const STATUS_CLASS = {
    pending:   styles.statusPending,
    attended:  styles.statusAttended,
    completed: styles.statusCompleted,
    retake:    styles.statusRetake,
    failed:    styles.statusFailed,
};

function StatusPill({ status }) {
    return (
        <span className={`${styles.statusPill} ${STATUS_CLASS[status] || ""}`}>
            {STATUS_LABEL[status] || status}
        </span>
    );
}

/**
 * Attendee roster table for the training detail page.
 *
 * @param {object[]}  attendees        - training.attendees
 * @param {boolean}   canManage        - Whether status-change / remove actions are shown
 * @param {Function}  onStatusClick    - (attendee) => void — opens the status modal
 * @param {Function}  onRemove         - (caregiverId) => void
 * @param {boolean}   isActionPending  - Disables row actions while a mutation is in flight
 */
export default function AttendeeRoster({ attendees, canManage, onStatusClick, onRemove, isActionPending }) {
    if (!attendees || attendees.length === 0) {
        return <p className={styles.emptyNote}>No attendees added yet.</p>;
    }

    return (
        <Table>
            <TableHeader>
                <TableCell className={styles.colName}>Caregiver</TableCell>
                <TableCell className={styles.colStatus}>Status</TableCell>
                <TableCell className={styles.colNotes}>Notes</TableCell>
                <TableCell className={styles.colDate}>Retake Date</TableCell>
                <TableCell className={styles.colDecided}>Decided</TableCell>
                {canManage && <TableCell className={styles.colActions}>Actions</TableCell>}
            </TableHeader>

            {attendees.map((attendee) => (
                <TableContent key={attendee.caregiver?._id || attendee.caregiver?.id || attendee.caregiver}>
                    <TableCell className={styles.colName}>
                        <PersonName role="caregiver" person={attendee.caregiver} />
                    </TableCell>
                    <TableCell className={styles.colStatus}>
                        <StatusPill status={attendee.status} />
                    </TableCell>
                    <TableCell className={styles.colNotes}>
                        {attendee.notes || <span className={styles.emptyNote}>—</span>}
                    </TableCell>
                    <TableCell className={styles.colDate}>
                        {attendee.status === "retake" ? formatDateOnly(attendee.retakeDate) : "—"}
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
                    {canManage && (
                        <TableCell className={styles.colActions}>
                            <div className={styles.actionsRow}>
                                <IconButton
                                    title="Set status"
                                    onClick={() => onStatusClick(attendee)}
                                    disabled={isActionPending}
                                >
                                    <Pencil size={15} />
                                </IconButton>
                                <IconButton
                                    variant="danger"
                                    title="Remove attendee"
                                    onClick={() => onRemove(attendee.caregiver?._id || attendee.caregiver?.id || attendee.caregiver)}
                                    disabled={isActionPending}
                                >
                                    <Trash2 size={15} />
                                </IconButton>
                            </div>
                        </TableCell>
                    )}
                </TableContent>
            ))}
        </Table>
    );
}
