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
//   vacation_pay_request   — shows a payout summary (dollars, period, balance)
//   paid_sick_time_request — shows the sick date and requested hours, plus an
//                            optional "hours to pay" field. The approver may pay
//                            fewer hours than requested but never more, and a
//                            cut makes the note required (the caregiver sees it)
//   overtime_mandate       — text description only; no extra summary block
//   caregiver_device_change, alternate_location_clock_in — text description only
//
// An optional note textarea is available for all types.
//
// The reason / note is managed as local state here — it
// never need to live in the parent. When the admin confirms, onConfirm(reason,
// { hours }) is called — hours only set when a sick-time request is cut — and
// the parent is responsible for calling the API and closing the modal on success.
//
// Props:
//   isOpen           {boolean}
//   onClose          {fn}                   called on Cancel or backdrop click
//   onConfirm        {fn(reason: string, extra: { hours?: number })}   called when admin clicks Confirm
//   subjectType      {string}               "caregiver_certificate" | "overtime_mandate" | "banked_hours_payout" | "vacation_pay_request" | "paid_sick_time_request" | "caregiver_device_change" | "alternate_location_clock_in"
//   caregiverName    {string}
//   subjectContext   {object}               approval.subjectContext
//   isEditingDates   {boolean}              true when admin has cert dates in edit mode
//   draftDates       {{ startDate, expiryDate, renewalDate }}
//   isApprovePending {boolean}              disables buttons while API call is in flight
//   approveError     {string|null}          error message from useApprovals

import { useState } from "react";
import Modal from "@components/UI/Modal/Modal";
import Button from "@components/UI/Button/Button";
import ActionMessage from "@components/UI/Feedback/ActionMessage";
import { CheckCircle2, Loader, AlertTriangle, Banknote, DollarSign, Thermometer } from "lucide-react";
import { DISPLAY_TZ, formatDateOnly } from "@/utils/dates";
import styles from "../approval_detail.module.css";

// Local copy — only used in this file. BankedHoursPayout.js has its own copy
// for the same reason: small pure helper, no shared module needed yet.
function formatPayPeriod(payPeriod) {
    if (!payPeriod) return "—";
    const start = payPeriod.start ? formatDateOnly(payPeriod.start, DISPLAY_TZ) : "";
    const end   = payPeriod.end   ? formatDateOnly(payPeriod.end,   DISPLAY_TZ) : "";
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

    // paid_sick_time_request only — blank means "pay what was requested".
    const [hours,      setHours]      = useState("");

    // ── Sick-time validation (derived live from the inputs) ─────────────────
    // Mirrors the server's INVALID_APPROVED_HOURS / ADJUSTMENT_REASON_REQUIRED
    // rules. Every message updates as the admin types, and Confirm is disabled
    // while any of them is showing. Other approval types never set these.

    const isSickTime     = subjectType === "paid_sick_time_request";
    const requestedHours = Number(subjectContext?.requestedHours);
    const hasHours       = isSickTime && hours.trim() !== "";   // blank = pay what was requested
    const hoursValue     = Number(hours);

    // Hours must be more than 0 and at most the requested hours.
    const hoursError = hasHours &&
        (!Number.isFinite(hoursValue) || hoursValue <= 0 || (Number.isFinite(requestedHours) && hoursValue > requestedHours))
        ? `Enter more than 0 and at most ${subjectContext?.requestedHours ?? "the requested"} hours.`
        : "";

    // A valid amount below the requested hours is a cut.
    const isCut = hasHours && !hoursError && hoursValue < requestedHours;

    // A cut needs a note — the caregiver sees it as the explanation.
    const reasonError = isCut && !reason.trim()
        ? "A note is required when paying fewer hours than requested."
        : "";

    const hasError = !!hoursError || !!reasonError;

    function handleClose() {
        setReason("");
        setHours("");
        onClose();
    }

    function handleConfirm() {
        if (hasError) return;
        // Paying exactly what was requested is the same as omitting hours.
        onConfirm(reason, isCut ? { hours: hoursValue } : {});
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
                    {subjectType === "overtime_mandate"        ? "Mandate Overtime"     :
                     subjectType === "banked_hours_payout"     ? "Approve Payout"       :
                     subjectType === "vacation_pay_request"    ? "Approve Vacation Payout" :
                     subjectType === "paid_sick_time_request"  ? "Approve Paid Sick Time"    :
                     subjectType === "caregiver_device_change" ? "Approve Device Change" :
                     subjectType === "alternate_location_clock_in" ? "Approve Alternate Location" :
                     "Approve Certificate"}
                </h2>

                {/* Description */}
                <p className={styles.approveModalDesc}>
                    {subjectType === "overtime_mandate"
                        ? `${caregiverName} will remain assigned to the shift. Their overage will be recorded as overtime pay and clock-in will unblock.`
                        : subjectType === "banked_hours_payout"
                        ? "The requested hours will be paid out in the specified pay period."
                        : subjectType === "vacation_pay_request"
                        ? "The requested vacation pay will be paid out in the specified pay period."
                        : subjectType === "paid_sick_time_request"
                        ? "The sick hours will be paid in the sick date's pay period if it is still open, otherwise the current pay period. You can pay fewer hours than requested, but not more."
                        : subjectType === "caregiver_device_change"
                        ? `${caregiverName}'s account will be bound to the new device. Their session on the old device ends immediately, and they must sign in again on the new one.`
                        : subjectType === "alternate_location_clock_in"
                        ? `This confirms ${caregiverName} was allowed to start the shift from this location. It doesn't change the shift's times or pay.`
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

                {/* vacation_pay_request — show payout summary for final review */}
                {subjectType === "vacation_pay_request" && (
                    <div className={styles.approveModalDatesCheck}>
                        <div className={styles.approveModalDatesCheckHeader}>
                            <DollarSign size={13} />
                            Payout Summary
                        </div>
                        <div className={styles.approveModalDatesCheckGrid}>
                            <div className={styles.approveModalDatesCheckRow}>
                                <span className={styles.approveModalDatesCheckLabel}>Requested Amount</span>
                                <span className={styles.approveModalDatesCheckValue}>
                                    {subjectContext.requestedDollars != null ? `$${subjectContext.requestedDollars}` : "—"}
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
                                    {subjectContext.currentBalance != null ? `$${subjectContext.currentBalance}` : "—"}
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                {/* paid_sick_time_request — summary plus optional hours cut */}
                {subjectType === "paid_sick_time_request" && (
                    <div className={styles.approveModalDatesCheck}>
                        <div className={styles.approveModalDatesCheckHeader}>
                            <Thermometer size={13} />
                            Sick Time Summary
                        </div>
                        <div className={styles.approveModalDatesCheckGrid}>
                            <div className={styles.approveModalDatesCheckRow}>
                                <span className={styles.approveModalDatesCheckLabel}>Sick Date</span>
                                <span className={styles.approveModalDatesCheckValue}>
                                    {formatDateOnly(subjectContext.sickDate)}
                                </span>
                            </div>
                            <div className={styles.approveModalDatesCheckRow}>
                                <span className={styles.approveModalDatesCheckLabel}>Requested Hours</span>
                                <span className={styles.approveModalDatesCheckValue}>
                                    {subjectContext.requestedHours != null ? `${subjectContext.requestedHours} h` : "—"}
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                {subjectType === "paid_sick_time_request" && (
                    <div className={styles.approveReasonField}>
                        <label className={styles.approveReasonLabel}>Hours to pay (optional)</label>
                        <input
                            type="number"
                            className={styles.approveHoursInput}
                            min={0}
                            max={Number.isFinite(requestedHours) ? requestedHours : undefined}
                            step="0.25"
                            placeholder={subjectContext.requestedHours != null
                                ? `${subjectContext.requestedHours} (as requested or fewer)`
                                : "As requested or fewer"}
                            value={hours}
                            onChange={(e) => setHours(e.target.value)}
                        />
                        {hoursError && <span className={styles.approveFieldError}>{hoursError}</span>}
                    </div>
                )}

                <ActionMessage variant="error" message={approveError} />

                {/* Note — optional for all approval types, except a sick-time cut,
                    where the caregiver sees it as the explanation */}
                <div className={styles.approveReasonField}>
                    <label className={styles.approveReasonLabel}>
                        {isCut
                            ? <>Note <span style={{ color: "#dc2626" }}>*</span></>
                            : "Note (optional)"}
                    </label>
                    <textarea
                        className={styles.approveReasonTextarea}
                        rows={2}
                        placeholder={subjectType === "paid_sick_time_request"
                            ? "Add a note — required if paying fewer hours; the caregiver sees it…"
                            : "Add an optional note…"}
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                    />
                    {reasonError && <span className={styles.approveFieldError}>{reasonError}</span>}
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
                        // Shown but not clickable while any field error is showing
                        disabled={isApprovePending || hasError}
                        onClick={handleConfirm}
                    >
                        {isApprovePending                          ? "Submitting…"      :
                         subjectType === "overtime_mandate"        ? "Confirm Mandate"  :
                         subjectType === "banked_hours_payout"     ? "Confirm Payout"   :
                         subjectType === "vacation_pay_request"    ? "Confirm Payout"   :
                         subjectType === "alternate_location_clock_in" ? "Approve Location" :
                         "Confirm Approve"}
                    </Button>
                </div>

            </div>
        </Modal>
    );
}
