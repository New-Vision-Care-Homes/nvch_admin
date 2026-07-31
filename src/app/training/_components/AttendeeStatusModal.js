"use client";

import { useEffect, useState } from "react";
import { ClipboardCheck, Loader } from "lucide-react";
import Modal from "@components/UI/Modal";
import Button from "@components/UI/Button";
import ActionMessage from "@components/UI/ActionMessage";
import { toDateInput } from "@/utils/dates";
import { useTrainings } from "@/hooks/useTrainings";
import PersonName from "./PersonName";
import styles from "./AttendeeStatusModal.module.css";

const STATUS_OPTIONS = [
    { value: "pending",   label: "Pending" },
    { value: "attended",  label: "Attended" },
    { value: "completed", label: "Completed" },
    { value: "retake",    label: "Retake" },
    { value: "failed",    label: "Failed" },
];

/**
 * Modal for grading a single attendee (status + retake date + notes).
 *
 * @param {boolean}   isOpen
 * @param {Function}  onClose
 * @param {string}    trainingId
 * @param {object}    attendee    - The attendee entry being edited (or null)
 * @param {Function}  [onSuccess] - Called after the status update succeeds
 */
export default function AttendeeStatusModal({ isOpen, onClose, trainingId, attendee, onSuccess }) {
    const { setAttendeeStatus, isActionPending, actionError } = useTrainings({}, { enabled: false });

    const [status, setStatus]         = useState("pending");
    const [retakeDate, setRetakeDate] = useState("");
    const [notes, setNotes]           = useState("");
    const [validationError, setValidationError] = useState("");

    useEffect(() => {
        if (attendee) {
            setStatus(attendee.status || "pending");
            setRetakeDate(toDateInput(attendee.retakeDate));
            setNotes(attendee.notes || "");
            setValidationError("");
        }
    }, [attendee]);

    if (!isOpen || !attendee) return null;

    const caregiverId = attendee.caregiver?._id || attendee.caregiver?.id || attendee.caregiver;

    const handleSubmit = () => {
        if (status === "retake" && !retakeDate) {
            setValidationError("Retake date is required.");
            return;
        }
        const body = { status, notes: notes.trim() || undefined };
        if (status === "retake") body.retakeDate = retakeDate;
        setAttendeeStatus({ id: trainingId, caregiverId, body }, {
            onSuccess: () => { onSuccess?.(); onClose(); },
        });
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <div className={styles.modalContent}>
                <div className={styles.modalIcon}>
                    <ClipboardCheck size={26} strokeWidth={1.5} />
                </div>
                <h2 className={styles.modalTitle}>
                    Set Status — <PersonName role="caregiver" person={attendee.caregiver} />
                </h2>

                {actionError && <ActionMessage variant="error" message={actionError} />}

                <div className={styles.fieldRow}>
                    <label className={styles.fieldLabel}>Status</label>
                    <select
                        className={styles.fieldInput}
                        value={status}
                        onChange={(e) => { setStatus(e.target.value); setValidationError(""); }}
                        disabled={isActionPending}
                    >
                        {STATUS_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                    </select>
                </div>

                {status === "retake" && (
                    <div className={styles.fieldRow}>
                        <label className={styles.fieldLabel}>
                            Retake Date <span className={styles.fieldRequired}>*</span>
                        </label>
                        <input
                            type="date"
                            className={styles.fieldInput}
                            value={retakeDate}
                            onChange={(e) => setRetakeDate(e.target.value)}
                            disabled={isActionPending}
                        />
                    </div>
                )}

                {validationError && <span className={styles.fieldError}>{validationError}</span>}

                <div className={styles.fieldRow}>
                    <label className={styles.fieldLabel}>Notes (optional)</label>
                    <textarea
                        className={styles.textarea}
                        rows={3}
                        maxLength={1000}
                        placeholder="Add an optional note…"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
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
