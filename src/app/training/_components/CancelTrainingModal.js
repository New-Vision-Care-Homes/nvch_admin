"use client";

import { Ban, Loader } from "lucide-react";
import Modal from "@components/UI/Modal";
import Button from "@components/UI/Button";
import ActionMessage from "@components/UI/ActionMessage";
import { useTrainings } from "@/hooks/useTrainings";
import styles from "./CancelTrainingModal.module.css";

/**
 * Confirm-cancel modal for a training. Cancelling is a soft action (sets
 * status: "cancelled", keeps the record) — this is intentionally worded
 * differently from the generic ConfirmDeleteModal, which is reused elsewhere
 * for hard deletes.
 *
 * @param {boolean}   isOpen
 * @param {Function}  onClose
 * @param {string}    trainingId
 * @param {string}    trainingTitle
 * @param {Function}  [onSuccess]
 */
export default function CancelTrainingModal({ isOpen, onClose, trainingId, trainingTitle, onSuccess }) {
    const { cancelTraining, isActionPending, actionError } = useTrainings({}, { enabled: false });

    if (!isOpen) return null;

    const handleConfirm = () => {
        cancelTraining(trainingId, {
            onSuccess: () => { onSuccess?.(); onClose(); },
        });
    };

    return (
        <Modal isOpen={isOpen} onClose={!isActionPending ? onClose : () => {}}>
            <div className={styles.modalContent}>
                <div className={styles.modalIcon}>
                    <Ban size={26} strokeWidth={1.5} />
                </div>
                <h2 className={styles.modalTitle}>Cancel {trainingTitle}?</h2>
                <p className={styles.modalDesc}>
                    This prunes all payroll entries for this training and cancels every attendee&apos;s
                    still-open completion-certificate approval. The record stays on file — this is
                    not a permanent delete.
                </p>

                {actionError && <ActionMessage variant="error" message={actionError} />}

                <div className={styles.modalButtons}>
                    <Button
                        variant="danger"
                        icon={isActionPending ? <Loader size={14} className={styles.spin} /> : null}
                        disabled={isActionPending}
                        onClick={handleConfirm}
                    >
                        {isActionPending ? "Cancelling…" : "Yes, Cancel Training"}
                    </Button>
                    <Button variant="secondary" onClick={onClose} disabled={isActionPending}>
                        Keep Training
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
