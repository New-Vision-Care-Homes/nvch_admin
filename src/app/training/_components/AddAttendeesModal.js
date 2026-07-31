"use client";

import { useState } from "react";
import { UserPlus, Loader } from "lucide-react";
import Modal from "@components/UI/Modal";
import Button from "@components/UI/Button";
import ActionMessage from "@components/UI/ActionMessage";
import { useTrainings } from "@/hooks/useTrainings";
import PersonMultiSelect from "./PersonMultiSelect";
import styles from "./AddAttendeesModal.module.css";

/**
 * Modal for adding one or more caregivers to a training's attendee roster.
 * The endpoint is sequential/partial-success — a per-cell failure list is
 * rendered inline rather than treated as a hard error.
 *
 * @param {boolean}   isOpen
 * @param {Function}  onClose
 * @param {string}    trainingId
 */
export default function AddAttendeesModal({ isOpen, onClose, trainingId }) {
    const { addAttendees, isActionPending, actionError } = useTrainings({}, { enabled: false });
    const [selected, setSelected] = useState([]);
    const [failed, setFailed]     = useState([]); // [{ caregiverId, code, error, firstName, lastName }]

    if (!isOpen) return null;

    const handleClose = () => {
        setSelected([]);
        setFailed([]);
        onClose();
    };

    const handleSubmit = () => {
        if (selected.length === 0) return;
        const byId = new Map(selected.map((p) => [p._id, p]));
        addAttendees({ id: trainingId, caregiverIds: selected.map((p) => p._id) }, {
            onSuccess: (data) => {
                const stillFailed = data.failed ?? [];
                if (stillFailed.length === 0) {
                    handleClose();
                } else {
                    // Keep only the caregivers that failed selected, so the admin can retry the rest.
                    const failedIds = new Set(stillFailed.map((f) => f.caregiverId));
                    setSelected((prev) => prev.filter((p) => failedIds.has(p._id)));
                    setFailed(stillFailed.map((f) => ({ ...f, ...byId.get(f.caregiverId) })));
                }
            },
        });
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose} className={styles.wideModal}>
            <div className={styles.modalContent}>
                <div className={styles.modalHeader}>
                    <span className={styles.modalIcon}>
                        <UserPlus size={18} strokeWidth={1.75} />
                    </span>
                    <div>
                        <h2 className={styles.modalTitle}>Add Attendees</h2>
                        <p className={styles.modalSubtitle}>Search and select caregivers to add to this training&apos;s roster.</p>
                    </div>
                </div>

                {actionError && <ActionMessage variant="error" message={actionError} />}

                <div className={styles.field}>
                    <PersonMultiSelect
                        role="caregiver"
                        selected={selected}
                        onAdd={(p) => setSelected((prev) => [...prev, p])}
                        onRemove={(id) => setSelected((prev) => prev.filter((p) => p._id !== id))}
                        disabled={isActionPending}
                    />
                </div>

                {failed.length > 0 && (
                    <div className={styles.failedList}>
                        <p className={styles.failedTitle}>Some attendees could not be added:</p>
                        {failed.map((f) => (
                            <p key={f.caregiverId} className={styles.failedRow}>
                                {f.firstName} {f.lastName} — {f.error}
                            </p>
                        ))}
                    </div>
                )}

                <div className={styles.modalButtons}>
                    <Button
                        variant="primary"
                        icon={isActionPending ? <Loader size={14} className={styles.spin} /> : null}
                        disabled={isActionPending || selected.length === 0}
                        onClick={handleSubmit}
                    >
                        {isActionPending ? "Adding…" : "Add"}
                    </Button>
                    <Button variant="secondary" onClick={handleClose} disabled={isActionPending}>
                        Close
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
