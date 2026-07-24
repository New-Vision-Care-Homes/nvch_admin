"use client";

// ─── ApproveModal ─────────────────────────────────────────────────────────────
//
// Confirmation modal shown when an admin clicks the Approve / Mandate / Approve
// Payout button on a pending approval. The modal title, description, and summary
// block all vary by subject type:
//
//   caregiver_certificate  — shows cert dates (draft values if admin edited them)
//                            for final verification before confirming
//   banked_hours_payout    — shows a payout summary (hours, period, balance)
//   overtime_mandate       — text description only; no extra summary block
//
// An optional note textarea is available for all types.
//
// The reason / note is managed as local state here — it never needs to live in
// the parent. When the admin confirms, onConfirm(reason) is called and the parent
// is responsible for calling the API and closing the modal on success.
//
// Props:
//   isOpen           {boolean}
//   onClose          {fn}                   called on Cancel or backdrop click
//   onConfirm        {fn(reason: string)}   called when admin clicks Confirm
//   subjectType      {string}               "caregiver_certificate" | "overtime_mandate" | "banked_hours_payout"
//   caregiverName    {string}
//   subjectContext   {object}               approval.subjectContext
//   isEditingDates   {boolean}              true when admin has cert dates in edit mode
//   draftDates       {{ startDate, expiryDate, renewalDate }}
//   isApprovePending {boolean}              disables buttons while API call is in flight
//   approveError     {string|null}          error message from useApprovals

import { useState } from "react";
import Modal from "@components/UI/Modal";
import Button from "@components/UI/Button";
import ActionMessage from "@components/UI/ActionMessage";
import { CheckCircle2, Loader, AlertTriangle, Banknote } from "lucide-react";
import { formatDateOnly } from "@/utils/dates";
import styles from "../approval_detail.module.css";

// Local copy — only used in this file. BankedHoursPayout.js has its own copy
// for the same reason: small pure helper, no shared module needed yet.
function formatPayPeriod(payPeriod) {
    if (!payPeriod) return "—";
    const start = payPeriod.start ? formatDateOnly(payPeriod.start) : "";
    const end   = payPeriod.end   ? formatDateOnly(payPeriod.end)   : "";
    return start && end ? `${start} – ${end}` : start || end || "—";
}

export default function ApproveModal({
    isOpen,
    onClose,
    onConfirm,
    subjectType,
    caregiverName,
    subjectContext,
    isEditingDates,
    draftDates,
    isApprovePending,
    approveError,
}) {
    const [reason, setReason] = useState("");

    function handleClose() {
        setReason("");
        onClose();
    }

    return (
        <Modal isOpen={isOpen} onClose={handleClose}>
            <div className={styles.approveModal}>

                {/* Icon */}
                <div className={styles.approveModalIcon}>
                    <CheckCircle2 size={28} strokeWidth={1.5} />
                </div>

                {/* Title */}
                <h2 className={styles.approveModalTitle}>
                    {subjectType === "overtime_mandate"    ? "Mandate Overtime" :
                     subjectType === "banked_hours_payout" ? "Approve Payout"   :
                     "Approve Certificate"}
                </h2>

                {/* Description */}
                <p className={styles.approveModalDesc}>
                    {subjectType === "overtime_mandate"
                        ? `${caregiverName} will remain assigned to the shift. Their overage will be recorded as overtime pay and clock-in will unblock.`
                        : subjectType === "banked_hours_payout"
                        ? "The requested hours will be paid out in the specified pay period."
                        : "Are you sure you want to approve this? Please verify the issue and expiry dates are correct before confirming."}
                </p>

                {/* caregiver_certificate — show cert dates for final verification.
                    If admin edited the dates, draft values are shown instead of the
                    original API values so the admin can confirm what will be saved. */}
                {subjectType === "caregiver_certificate" && (
                    <div className={styles.approveModalDatesCheck}>
                        <div className={styles.approveModalDatesCheckHeader}>
                            <AlertTriangle size={13} />
                            Certificate Dates
                        </div>
                        <div className={styles.approveModalDatesCheckGrid}>
                            <div className={styles.approveModalDatesCheckRow}>
                                <span className={styles.approveModalDatesCheckLabel}>Issue Date</span>
                                <span className={styles.approveModalDatesCheckValue}>
                                    {isEditingDates && draftDates.startDate
                                        ? formatDateOnly(draftDates.startDate)
                                        : formatDateOnly(subjectContext.startDate)}
                                </span>
                            </div>
                            <div className={styles.approveModalDatesCheckRow}>
                                <span className={styles.approveModalDatesCheckLabel}>Expiry Date</span>
                                <span className={styles.approveModalDatesCheckValue}>
                                    {isEditingDates && draftDates.expiryDate
                                        ? formatDateOnly(draftDates.expiryDate)
                                        : formatDateOnly(subjectContext.expiryDate)}
                                </span>
                            </div>
                            {(isEditingDates ? draftDates.renewalDate : subjectContext.renewalDate) && (
                                <div className={styles.approveModalDatesCheckRow}>
                                    <span className={styles.approveModalDatesCheckLabel}>Renewal Date</span>
                                    <span className={styles.approveModalDatesCheckValue}>
                                        {isEditingDates && draftDates.renewalDate
                                            ? formatDateOnly(draftDates.renewalDate)
                                            : formatDateOnly(subjectContext.renewalDate)}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* banked_hours_payout — show payout summary for final review */}
                {subjectType === "banked_hours_payout" && (
                    <div className={styles.approveModalDatesCheck}>
                        <div className={styles.approveModalDatesCheckHeader}>
                            <Banknote size={13} />
                            Payout Summary
                        </div>
                        <div className={styles.approveModalDatesCheckGrid}>
                            <div className={styles.approveModalDatesCheckRow}>
                                <span className={styles.approveModalDatesCheckLabel}>Requested Hours</span>
                                <span className={styles.approveModalDatesCheckValue}>
                                    {subjectContext.requestedHours != null ? `${subjectContext.requestedHours} h` : "—"}
                                </span>
                            </div>
                            <div className={styles.approveModalDatesCheckRow}>
                                <span className={styles.approveModalDatesCheckLabel}>Pay Period</span>
                                <span className={styles.approveModalDatesCheckValue}>
                                    {formatPayPeriod(subjectContext.payPeriod)}
                                </span>
                            </div>
                            <div className={styles.approveModalDatesCheckRow}>
                                <span className={styles.approveModalDatesCheckLabel}>Balance at Request</span>
                                <span className={styles.approveModalDatesCheckValue}>
                                    {subjectContext.currentBalance != null ? `${subjectContext.currentBalance} h` : "—"}
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                <ActionMessage variant="error" message={approveError} />

                {/* Optional note — available for all approval types */}
                <div className={styles.approveReasonField}>
                    <label className={styles.approveReasonLabel}>Note (optional)</label>
                    <textarea
                        className={styles.approveReasonTextarea}
                        rows={2}
                        placeholder="Add an optional note…"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                    />
                </div>

                <div className={styles.approveModalActions}>
                    <Button
                        variant="secondary"
                        onClick={handleClose}
                        disabled={isApprovePending}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="primary"
                        icon={isApprovePending
                            ? <Loader size={14} className={styles.spinnerIcon} />
                            : <CheckCircle2 size={14} />
                        }
                        disabled={isApprovePending}
                        onClick={() => onConfirm(reason)}
                    >
                        {isApprovePending                          ? "Submitting…"      :
                         subjectType === "overtime_mandate"        ? "Confirm Mandate"  :
                         subjectType === "banked_hours_payout"     ? "Confirm Payout"   :
                         "Confirm Approve"}
                    </Button>
                </div>

            </div>
        </Modal>
    );
}
