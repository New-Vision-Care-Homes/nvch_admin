"use client";

import { AlertTriangle } from "lucide-react";
import styles from "./UnsavedChangesModal.module.css";

/**
 * Warns before discarding unsaved edits when navigating away from a form
 * (e.g. switching profile tabs while a field is still dirty).
 *
 * @param {boolean}  isOpen    - Whether the modal is visible
 * @param {Function} onClose   - Called when user chooses to keep editing (backdrop click or Cancel)
 * @param {Function} onConfirm - Called when user confirms discarding the changes
 */
export default function UnsavedChangesModal({ isOpen, onClose, onConfirm }) {
    if (!isOpen) return null;

    return (
        <>
            <div className={styles.overlay} onClick={onClose} />
            <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="unsaved-changes-title">
                <div className={styles.iconWrap}>
                    <AlertTriangle size={28} />
                </div>
                <h2 id="unsaved-changes-title" className={styles.title}>Unsaved Changes</h2>
                <p className={styles.message}>
                    You have unsaved changes on this page. If you leave now, they will be lost.
                </p>
                <div className={styles.actions}>
                    <button className={styles.cancelBtn} onClick={onClose}>
                        Keep Editing
                    </button>
                    <button className={styles.discardBtn} onClick={onConfirm}>
                        Discard &amp; Leave
                    </button>
                </div>
            </div>
        </>
    );
}
