"use client";

// ─── MandateRejectModal ───────────────────────────────────────────────────────
//
// Rejection flow for overtime_mandate approvals. Removing a mandated caregiver
// requires selecting a replacement who gets assigned to the shift immediately.
//
// API call order (intentional):
//   1. updateShift()  — reassign the shift to the replacement first.
//      If this fails (e.g. the replacement has a scheduling conflict), the
//      error is shown inside the modal so the admin can either pick a different
//      caregiver or cancel the shift entirely.
//   2. reject()       — only called after updateShift() succeeds. This finalises
//      the approval rejection.
//
// "Cancel Shift" path (shown when updateShift fails):
//   1. cancelShift()  — marks the shift as cancelled.
//   2. reject()       — finalises the rejection.
//   In either path, onSuccess() is called once everything completes.
//
// Caregiver list is pre-filtered to the shift's home region so only locally
// available caregivers are shown. Falls back to all active caregivers if the
// shift has no home region.
//
// Props:
//   isOpen               {boolean}
//   onClose              {fn}
//   onSuccess            {fn()}               called when the full flow completes
//   caregiverName        {string}             name of caregiver being removed
//   approvalId           {string}             passed to reject()
//   approvalSubjectId    {string}             the shift ID
//   shiftDetail          {object}             current shift — used for the update payload and region
//   reject               {fn}                 mutateAsync from useApprovals
//   updateShift          {fn}                 mutateAsync from useShifts
//   cancelShift          {fn}                 mutateAsync from useShifts
//   isRejectPending      {boolean}
//   isShiftActionPending {boolean}
//   isCancelPending      {boolean}
//   rejectError          {string|null}        fallback for final reject() failure

import { useState } from "react";
import Modal from "@components/UI/Modal";
import Button from "@components/UI/Button";
import ActionMessage from "@components/UI/ActionMessage";
import { useCaregivers } from "@/hooks/useCaregivers";
import { User, UserMinus, Loader, AlertTriangle } from "lucide-react";
import styles from "../approval_detail.module.css";

export default function MandateRejectModal({
    isOpen,
    onClose,
    onSuccess,
    caregiverName,
    approvalId,
    approvalSubjectId,
    shiftDetail,
    reject,
    updateShift,
    cancelShift,
    isRejectPending,
    isShiftActionPending,
    isCancelPending,
    rejectError,
}) {
    const [newCaregiver,    setNewCaregiver]    = useState(null);
    const [caregiverSearch, setCaregiverSearch] = useState("");
    const [caregiverErr,    setCaregiverErr]    = useState("");
    const [rejectReason,    setRejectReason]    = useState("");
    const [rejectReasonErr, setRejectReasonErr] = useState("");

    // Set when updateShift() fails — shown as an error block with two alternatives
    const [shiftUpdateError, setShiftUpdateError] = useState(null);
    // Set when cancelShift() fails
    const [cancelError, setCancelError] = useState(null);

    // Pre-filtered to the shift's home region. Falls back to all active caregivers
    // when the shift has no home region (e.g. client-only shift).
    const shiftRegion = shiftDetail?.home?.region;
    const { caregivers: searchResults } = useCaregivers({
        params: {
            page: 1,
            limit: 8,
            search: caregiverSearch,
            isActive: true,
            ...(shiftRegion && { region: shiftRegion }),
        },
    });

    function resetAndClose() {
        setNewCaregiver(null);
        setCaregiverSearch("");
        setCaregiverErr("");
        setRejectReason("");
        setRejectReasonErr("");
        setShiftUpdateError(null);
        setCancelError(null);
        onClose();
    }

    // Called when admin selects a different caregiver after a shift-update failure.
    // Clear the old error so they can retry the same flow.
    function handleSelectCaregiver(caregiver) {
        setNewCaregiver(caregiver);
        setCaregiverSearch("");
        setCaregiverErr("");
        setShiftUpdateError(null);
        setCancelError(null);
    }

    // ── Primary flow: reassign shift → reject approval ────────────────────────

    async function handleConfirm() {
        let hasError = false;
        if (!newCaregiver) {
            setCaregiverErr("Please select a replacement caregiver.");
            hasError = true;
        }
        if (!rejectReason.trim()) {
            setRejectReasonErr("Please provide a reason for rejection.");
            hasError = true;
        }
        if (hasError) return;

        // Step 1: reassign the shift. If this fails (e.g. scheduling conflict),
        // surface the error and give the admin two alternatives.
        try {
            await updateShift({
                id: approvalSubjectId,
                data: {
                    caregiverId: newCaregiver.id,
                    startTime:   shiftDetail?.startTime,
                    endTime:     shiftDetail?.endTime,
                    timezone:    shiftDetail?.timezone ?? "America/Halifax",
                    notes:       shiftDetail?.notes,
                    tasks:       shiftDetail?.tasks ?? [],
                    ...(shiftDetail?.client?._id && { clientId: shiftDetail.client._id }),
                    ...(shiftDetail?.home?._id   && { homeId:   shiftDetail.home._id   }),
                    ...(shiftDetail?.geofence    && { geofence: shiftDetail.geofence   }),
                },
            });
        } catch (err) {
            const message =
                err?.response?.data?.details?.[0]?.msg ||
                err?.response?.data?.error ||
                "Failed to reassign the shift. The caregiver may have a scheduling conflict.";
            setShiftUpdateError(message);
            return;
        }

        // Step 2: shift reassigned — now finalise the rejection
        await finaliseRejection();
    }

    // ── Alternative flow: cancel the shift → reject approval ─────────────────

    async function handleCancelShift() {
        try {
            await cancelShift({ id: approvalSubjectId });
        } catch (err) {
            const message =
                err?.response?.data?.details?.[0]?.msg ||
                err?.response?.data?.error ||
                "Failed to cancel the shift.";
            setCancelError(message);
            return;
        }

        await finaliseRejection();
    }

    // Shared last step — called after either updateShift or cancelShift succeeds
    async function finaliseRejection() {
        try {
            await reject({ id: approvalId, reason: rejectReason.trim() });
            resetAndClose();
            onSuccess();
        } catch (_) {
            // rejectError from React Query is rendered via the prop below
        }
    }

    const isBusy = isRejectPending || isShiftActionPending || isCancelPending;

    return (
        <Modal isOpen={isOpen} onClose={resetAndClose}>
            <div className={styles.mandateRejectModal}>

                <div className={styles.mandateRejectIcon}>
                    <UserMinus size={28} strokeWidth={1.5} />
                </div>

                <h2 className={styles.approveModalTitle}>Reassign &amp; Remove from Shift</h2>
                <p className={styles.approveModalDesc}>
                    <strong>{caregiverName}</strong> will be removed from this shift.
                    Select a replacement caregiver before confirming.
                </p>

                {/* ── Replacement caregiver picker ──────────────────────────── */}
                <div className={styles.mandateField}>
                    <label className={styles.mandateFieldLabel}>
                        Replacement Caregiver <span className={styles.mandateRequired}>*</span>
                    </label>

                    {newCaregiver ? (
                        <div className={styles.mandateSelectedCaregiver}>
                            <User size={14} />
                            <span>{newCaregiver.firstName} {newCaregiver.lastName}</span>
                            <button
                                type="button"
                                className={styles.mandateDeselectBtn}
                                onClick={() => {
                                    setNewCaregiver(null);
                                    setShiftUpdateError(null);
                                    setCancelError(null);
                                }}
                                aria-label="Remove selected caregiver"
                            >
                                ×
                            </button>
                        </div>
                    ) : (
                        <div className={styles.mandateCaregiverSearch}>
                            <input
                                type="text"
                                className={`${styles.mandateSearchInput} ${caregiverErr ? styles.mandateInputError : ""}`}
                                placeholder="Search by name…"
                                value={caregiverSearch}
                                onChange={(e) => {
                                    setCaregiverSearch(e.target.value);
                                    setCaregiverErr("");
                                }}
                                autoComplete="off"
                            />
                            {caregiverSearch.length > 0 && searchResults.length > 0 && (
                                <div className={styles.mandateCaregiverDropdown}>
                                    {searchResults.map((caregiver) => (
                                        <button
                                            key={caregiver.id}
                                            type="button"
                                            className={styles.mandateCaregiverItem}
                                            onClick={() => handleSelectCaregiver(caregiver)}
                                        >
                                            {caregiver.firstName} {caregiver.lastName}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                    {caregiverErr && (
                        <span className={styles.mandateErrMsg}>{caregiverErr}</span>
                    )}
                </div>

                {/* ── Reason for rejection ─────────────────────────────────── */}
                <div className={styles.mandateField}>
                    <label className={styles.mandateFieldLabel}>
                        Reason for rejection <span className={styles.mandateRequired}>*</span>
                    </label>
                    <textarea
                        className={`${styles.rejectTextarea} ${rejectReasonErr ? styles.rejectTextareaError : ""}`}
                        rows={3}
                        placeholder="Explain why the caregiver is being removed from this shift…"
                        value={rejectReason}
                        onChange={(e) => {
                            setRejectReason(e.target.value);
                            if (e.target.value.trim()) setRejectReasonErr("");
                        }}
                    />
                    {rejectReasonErr && (
                        <span className={styles.mandateErrMsg}>{rejectReasonErr}</span>
                    )}
                </div>

                {/* ── Scheduling conflict error + alternatives ──────────────── */}
                {shiftUpdateError && (
                    <div className={styles.mandateConflictBlock}>
                        <div className={styles.mandateConflictHeader}>
                            <AlertTriangle size={14} />
                            Assignment failed
                        </div>
                        <p className={styles.mandateConflictMsg}>{shiftUpdateError}</p>
                        <p className={styles.mandateConflictHint}>
                            Deselect the current caregiver and pick a different one, or cancel the shift entirely.
                        </p>
                    </div>
                )}

                {/* Cancel-shift error */}
                {cancelError && <ActionMessage variant="error" message={cancelError} />}

                {/* Final reject() failure */}
                <ActionMessage variant="error" message={rejectError} />

                {/* ── Action buttons ────────────────────────────────────────── */}
                <div className={styles.approveModalActions}>
                    <Button
                        variant="secondary"
                        onClick={resetAndClose}
                        disabled={isBusy}
                    >
                        Cancel
                    </Button>

                    {/* Cancel Shift — only offered when the initial reassignment failed */}
                    {shiftUpdateError && (
                        <Button
                            variant="secondary"
                            icon={isCancelPending
                                ? <Loader size={14} className={styles.spinnerIcon} />
                                : undefined
                            }
                            disabled={isBusy}
                            onClick={handleCancelShift}
                        >
                            {isCancelPending ? "Cancelling shift…" : "Cancel Shift"}
                        </Button>
                    )}

                    <Button
                        variant="danger"
                        icon={(isRejectPending || isShiftActionPending)
                            ? <Loader size={14} className={styles.spinnerIcon} />
                            : <UserMinus size={14} />
                        }
                        disabled={isBusy}
                        onClick={handleConfirm}
                    >
                        {(isRejectPending || isShiftActionPending) ? "Submitting…" : "Confirm Reassign & Remove"}
                    </Button>
                </div>

            </div>
        </Modal>
    );
}
