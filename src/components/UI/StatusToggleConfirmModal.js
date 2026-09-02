"use client";

import Modal from "@components/UI/Modal";
import Button from "@components/UI/Button";

/**
 * Confirms activating/deactivating a person record (caregiver, admin, etc).
 *
 * @param {boolean}  isOpen      - Whether the modal is visible
 * @param {boolean}  isActive    - Current active status; determines the wording
 * @param {string}   entityLabel - e.g. "caregiver", "admin"
 * @param {Function} onConfirm   - Called when the user confirms the toggle
 * @param {Function} onCancel    - Called when user cancels (backdrop click or Cancel button)
 * @param {boolean}  isPending   - Disables both buttons while the toggle request is in flight
 */
export default function StatusToggleConfirmModal({ isOpen, isActive, entityLabel, onConfirm, onCancel, isPending }) {
	return (
		<Modal isOpen={isOpen} onClose={onCancel}>
			<div style={{ padding: '2rem 1rem', textAlign: 'center' }}>
				<h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem', color: '#1f2937' }}>
					Are you sure you want to {isActive ? "deactivate" : "activate"} this {entityLabel}?
				</h2>
				<div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
					<Button variant="secondary" onClick={onCancel} disabled={isPending}>
						No, Cancel
					</Button>
					<Button variant="primary" onClick={onConfirm} disabled={isPending}>
						Yes, {isActive ? "Deactivate" : "Activate"}
					</Button>
				</div>
			</div>
		</Modal>
	);
}
