"use client";

import { useEffect, useState } from "react";
import { LogIn, LogOut, Loader } from "lucide-react";
import Modal from "@components/UI/Modal";
import Button from "@components/UI/Button";
import ActionMessage from "@components/UI/ActionMessage";
import { useTrainings } from "@/hooks/useTrainings";
import PersonName from "./PersonName";
import styles from "./AddAttendeesModal.module.css";

const MODE_META = {
    "clock-in":  { title: "Clock In Attendees",  cta: "Clock In",  Icon: LogIn,  preselectState: "not_clocked_in" },
    "clock-out": { title: "Clock Out Attendees", cta: "Clock Out", Icon: LogOut, preselectState: "in_progress" },
};

function attendeeCaregiverId(attendee) {
    return attendee.caregiver?._id || attendee.caregiver?.id || attendee.caregiver;
}

/**
 * "Take the register" — bulk clock a set of attendees in or out at once.
 * Sequential, partial-success (mirrors AddAttendeesModal) — a per-cell
 * failure list is rendered inline rather than treated as a hard error.
 *
 * @param {boolean}     isOpen
 * @param {Function}    onClose
 * @param {string}      trainingId
 * @param {object[]}    attendees   - training.attendees
 * @param {"clock-in"|"clock-out"} mode
 */
export default function BulkAttendanceModal({ isOpen, onClose, trainingId, attendees, mode }) {
    const { bulkClockIn, bulkClockOut, isActionPending, actionError } = useTrainings({}, { enabled: false });
    const meta = MODE_META[mode] || MODE_META["clock-in"];

    const [selectedIds, setSelectedIds] = useState(new Set());
    const [at, setAt]                   = useState("");
    const [note, setNote]               = useState("");
    const [failed, setFailed]           = useState([]); // [{ caregiverId, code, error }]

    useEffect(() => {
        if (isOpen) {
            const preselected = (attendees ?? [])
                .filter((a) => (a.attendance?.state || "not_clocked_in") === meta.preselectState)
                .map((a) => String(attendeeCaregiverId(a)));
            setSelectedIds(new Set(preselected));
            setAt("");
            setNote("");
            setFailed([]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, mode]);

    if (!isOpen) return null;

    const toggle = (caregiverId) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            const key = String(caregiverId);
            if (next.has(key)) next.delete(key); else next.add(key);
            return next;
        });
    };

    const handleSubmit = () => {
        if (selectedIds.size === 0) return;
        const caregiverIds = Array.from(selectedIds);
        const body = {
            caregiverIds,
            ...(at && { at }),
            ...(note.trim() && { note: note.trim() }),
        };
        const mutate = mode === "clock-out" ? bulkClockOut : bulkClockIn;
        mutate({ id: trainingId, body }, {
            onSuccess: (data) => {
                const stillFailed = data.failed ?? [];
                if (stillFailed.length === 0) {
                    onClose();
                } else {
                    setSelectedIds(new Set(stillFailed.map((f) => String(f.caregiverId))));
                    setFailed(stillFailed);
                }
            },
        });
    };

    const nameFor = (caregiverId) => {
        const attendee = (attendees ?? []).find((a) => String(attendeeCaregiverId(a)) === String(caregiverId));
        return attendee ? <PersonName role="caregiver" person={attendee.caregiver} /> : caregiverId;
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} className={styles.wideModal}>
            <div className={styles.modalContent}>
                <div className={styles.modalHeader}>
                    <span className={styles.modalIcon}>
                        <meta.Icon size={18} strokeWidth={1.75} />
                    </span>
                    <div>
                        <h2 className={styles.modalTitle}>{meta.title}</h2>
                        <p className={styles.modalSubtitle}>Select who to {meta.cta.toLowerCase()}, then save.</p>
                    </div>
                </div>

                {actionError && <ActionMessage variant="error" message={actionError} />}

                <div className={styles.field}>
                    {(attendees ?? []).map((attendee) => {
                        const caregiverId = String(attendeeCaregiverId(attendee));
                        return (
                            <label key={caregiverId} className={styles.checkRow}>
                                <input
                                    type="checkbox"
                                    checked={selectedIds.has(caregiverId)}
                                    onChange={() => toggle(caregiverId)}
                                    disabled={isActionPending}
                                />
                                <PersonName role="caregiver" person={attendee.caregiver} />
                            </label>
                        );
                    })}
                </div>

                <div className={styles.field}>
                    <label className={styles.checkListLabel}>Backdate to (optional)</label>
                    <input
                        type="datetime-local"
                        className={styles.dateInput}
                        value={at}
                        onChange={(e) => setAt(e.target.value)}
                        disabled={isActionPending}
                    />
                </div>

                <div className={styles.field}>
                    <label className={styles.checkListLabel}>Note (optional)</label>
                    <textarea
                        className={styles.noteInput}
                        rows={2}
                        maxLength={500}
                        placeholder="e.g. roll call"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        disabled={isActionPending}
                    />
                </div>

                {failed.length > 0 && (
                    <div className={styles.failedList}>
                        <p className={styles.failedTitle}>Some attendees could not be clocked {mode === "clock-out" ? "out" : "in"}:</p>
                        {failed.map((f) => (
                            <p key={f.caregiverId} className={styles.failedRow}>
                                {nameFor(f.caregiverId)} — {f.error}
                            </p>
                        ))}
                    </div>
                )}

                <div className={styles.modalButtons}>
                    <Button
                        variant="primary"
                        icon={isActionPending ? <Loader size={14} className={styles.spin} /> : null}
                        disabled={isActionPending || selectedIds.size === 0}
                        onClick={handleSubmit}
                    >
                        {isActionPending ? "Saving…" : meta.cta}
                    </Button>
                    <Button variant="secondary" onClick={onClose} disabled={isActionPending}>
                        Close
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
