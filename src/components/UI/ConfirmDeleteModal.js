"use client";

import { Trash2, Loader } from "lucide-react";
import styles from "./ConfirmDeleteModal.module.css";

/**
 * Generic delete-confirmation modal.
 *
 * @param {boolean}  isOpen      - Whether the modal is visible
 * @param {Function} onClose     - Called when user cancels (backdrop click or Cancel button)
 * @param {Function} onConfirm   - Called when user confirms deletion
 * @param {string}   itemName    - Human-readable name of the item being deleted
 * @param {boolean}  isLoading   - Disables buttons and shows spinner on Delete
 */
export default function ConfirmDeleteModal({ isOpen, onClose, onConfirm, itemName, isLoading }) {
    if (!isOpen) return null;

    return (
        <>
            <div className={styles.overlay} onClick={!isLoading ? onClose : undefined} />
            <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="confirm-delete-title">
                <div className={styles.iconWrap}>
                    <Trash2 size={28} />
                </div>
                <h2 id="confirm-delete-title" className={styles.title}>Delete {itemName}?</h2>
                <p className={styles.message}>
                    Are you sure you want to permanently delete <strong>{itemName}</strong>?
                    This action cannot be undone.
                </p>
                <div className={styles.actions}>
                    <button className={styles.cancelBtn} onClick={onClose} disabled={isLoading}>
                        Cancel
                    </button>
                    <button className={styles.deleteBtn} onClick={onConfirm} disabled={isLoading}>
                        {isLoading && <Loader size={13} className={styles.spin} />}
                        Delete
                    </button>
                </div>
            </div>
        </>
    );
}
