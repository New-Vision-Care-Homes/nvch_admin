"use client";

import { useEffect, useState } from "react";
import { Timer, Loader } from "lucide-react";
import Modal from "@components/UI/Modal";
import Button from "@components/UI/Button";
import ActionMessage from "@components/UI/ActionMessage";
import { useTrainings } from "@/hooks/useTrainings";
import { ATTENDANCE_STATE_LABEL } from "./statusMeta";
import PersonName from "./PersonName";
import styles from "./AttendeeStatusModal.module.css";

// Matches the "YYYY-MM-DDTHH:mm" a <input type="datetime-local"> needs, same
// slice-based approach already used by the edit training page for
// startTime/endTime — no timezone conversion, the raw ISO digits are shown.
function toDateTimeLocal(iso) {
    return iso ? iso.slice(0, 16) : "";
}

/**
 * Supervisor override — fix a single attendee's clock pair (enter a missing
 * clock-in, close a dangling clock-out, correct a time, or clear a side).
 *
 * @param {boolean}   isOpen
 * @param {Function}  onClose
 * @param {string}    trainingId
 * @param {object}    attendee    - The attendee entry being fixed (or null)
 * @param {Function}  [onSuccess] - Called after the update succeeds
 */
export default function AttendanceOverrideModal({ isOpen, onClose, trainingId, attendee, onSuccess }) {
    const { setAttendeeAttendance, isActionPending, actionError } = useTrainings({}, { enabled: false });

    const [clockInAt, setClockInAt]               = useState("");
    const [clockOutAt, setClockOutAt]             = useState("");
    const [initialClockInAt, setInitialClockInAt] = useState("");
    const [initialClockOutAt, setInitialClockOutAt] = useState("");
    const [note, setNote]                         = useState("");
    const [validationError, setValidationError]   = useState("");

    useEffect(() => {
        if (attendee) {
            const inVal  = toDateTimeLocal(attendee.attendance?.clockInAt);
            const outVal = toDateTimeLocal(attendee.attendance?.clockOutAt);
            setClockInAt(inVal);
            setClockOutAt(outVal);
            setInitialClockInAt(inVal);
            setInitialClockOutAt(outVal);
            setNote("");
            setValidationError("");
        }
    }, [attendee]);

    if (!isOpen || !attendee) return null;

    const caregiverId = attendee.caregiver?._id || attendee.caregiver?.id || attendee.caregiver;
    const attendance   = attendee.attendance;

    const handleSubmit = () => {
        const body = {};
        if (clockInAt !== initialClockInAt)   body.clockInAt  = clockInAt  || null;
        if (clockOutAt !== initialClockOutAt) body.clockOutAt = clockOutAt || null;

        if (Object.keys(body).length === 0) {
            setValidationError("Change or clear at least one clock time before saving.");
            return;
        }
        if (clockInAt && clockOutAt && clockOutAt <= clockInAt) {
            setValidationError("Clock-out must be after clock-in.");
            return;
        }

        if (note.trim()) body.note = note.trim();

        setAttendeeAttendance({ id: trainingId, caregiverId, body }, {
            onSuccess: () => { onSuccess?.(); onClose(); },
        });
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <div className={styles.modalContent}>
                <div className={styles.modalIcon}>
                    <Timer size={26} strokeWidth={1.5} />
                </div>
                <h2 className={styles.modalTitle}>
                    Fix Attendance — <PersonName role="caregiver" person={attendee.caregiver} />
                </h2>

                {attendance && (
                    <p className={styles.contextNote}>
                        Currently: {ATTENDANCE_STATE_LABEL[attendance.state] || attendance.state}
                        {attendance.flags?.length > 0 && ` · ${attendance.flags.join(", ")}`}
                    </p>
                )}

                {actionError && <ActionMessage variant="error" message={actionError} />}

                <div className={styles.fieldRow}>
                    <label className={styles.fieldLabel}>Clock In</label>
                    <input
                        type="datetime-local"
                        className={styles.fieldInput}
                        value={clockInAt}
                        onChange={(e) => { setClockInAt(e.target.value); setValidationError(""); }}
                        disabled={isActionPending}
                    />
                    {clockInAt && (
                        <button type="button" className={styles.clearBtn} onClick={() => setClockInAt("")} disabled={isActionPending}>
                            Clear
                        </button>
                    )}
                </div>

                <div className={styles.fieldRow}>
                    <label className={styles.fieldLabel}>Clock Out</label>
                    <input
                        type="datetime-local"
                        className={styles.fieldInput}
                        value={clockOutAt}
                        onChange={(e) => { setClockOutAt(e.target.value); setValidationError(""); }}
                        disabled={isActionPending}
                    />
                    {clockOutAt && (
                        <button type="button" className={styles.clearBtn} onClick={() => setClockOutAt("")} disabled={isActionPending}>
                            Clear
                        </button>
                    )}
                </div>

                {validationError && <span className={styles.fieldError}>{validationError}</span>}

                <div className={styles.fieldRow}>
                    <label className={styles.fieldLabel}>Note (optional)</label>
                    <textarea
                        className={styles.textarea}
                        rows={2}
                        maxLength={500}
                        placeholder="e.g. forgot to clock in"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        disabled={isActionPending}
                    />
                </div>

                <div className={styles.modalButtons}>
                    <Button
                        variant="primary"
                        icon={isActionPending ? <Loader size={14} className={styles.spin} /> : null}
                        disabled={isActionPending}
                        onClick={handleSubmit}
                    >
                        {isActionPending ? "Saving…" : "Save"}
                    </Button>
                    <Button variant="secondary" onClick={onClose} disabled={isActionPending}>
                        Cancel
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
