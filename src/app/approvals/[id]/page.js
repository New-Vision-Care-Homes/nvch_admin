"use client";

// ─── Imports ──────────────────────────────────────────────────────────────────

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import PageLayout from "@components/layout/PageLayout";
import Button from "@components/UI/Button";
import Modal from "@components/UI/Modal";
import ErrorState from "@components/UI/ErrorState";
import ActionMessage from "@components/UI/ActionMessage";
import { Card, CardHeader, CardContent, InfoField } from "@components/UI/Card";
import { useApprovals } from "@/hooks/useApprovals";
import { useAdmins } from "@/hooks/useAdmins";
import { useProfile } from "@/hooks/useProfile";
import {
    Undo2,
    ClipboardCheck,
    User,
    Award,
    CheckCircle2,
    XCircle,
    Clock,
    CalendarDays,
    Loader,
    ShieldCheck,
    Ban,
    AlertTriangle,
    Timer,
    Scale,
    Banknote,
} from "lucide-react";
import styles from "./approval_detail.module.css";
import { formatDateTime, formatDateOnly, toDateInput } from "@/utils/dates";
import AcknowledgmentDecision from "./_components/AcknowledgmentDecision";
import CertificateApproval   from "./_components/CertificateApproval";
import OvertimeMandate        from "./_components/OvertimeMandate";
import BankedHoursPayout      from "./_components/BankedHoursPayout";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Convert a raw certificate type key (e.g. "first-aid-cpr") to a display name
 * with title-cased words ("First Aid Cpr"). Returns "—" when the value is absent.
 *
 * @param {string|null|undefined} raw
 * @returns {string}
 */
function formatCertName(raw) {
    if (!raw) return "—";
    return raw.replace(/-/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

/**
 * Format a pay period object as a human-readable date range string.
 * Also used in the approve modal's payout summary (BankedHoursPayout has its own copy).
 *
 * @param {{ start: string, end: string }|null|undefined} payPeriod
 * @returns {string}
 */
function formatPayPeriod(payPeriod) {
    if (!payPeriod) return "—";
    const startDate = payPeriod.start ? formatDateOnly(payPeriod.start) : "";
    const endDate   = payPeriod.end   ? formatDateOnly(payPeriod.end)   : "";
    return startDate && endDate ? `${startDate} – ${endDate}` : startDate || endDate || "—";
}

// ─── Constants ────────────────────────────────────────────────────────────────

/** Display metadata keyed by approval status. */
const STATUS_META = {
    pending:   { label: "Pending",   className: "status_pending",   Icon: Clock         },
    approved:  { label: "Approved",  className: "status_approved",  Icon: CheckCircle2  },
    rejected:  { label: "Rejected",  className: "status_rejected",  Icon: XCircle       },
    cancelled: { label: "Cancelled", className: "status_cancelled", Icon: Ban           },
};

/**
 * Return the banner title, body message, and visual variant for a decided or
 * cancelled approval. Returns null for pending approvals (no banner shown).
 *
 * @param {"pending"|"approved"|"rejected"|"cancelled"} status
 * @param {string} subjectType  — e.g. "caregiver_certificate", "overtime_mandate"
 * @returns {{ title: string, msg: string, variant: string }|null}
 */
function getBannerMeta(status, subjectType) {
    const maps = {
        overtime_acknowledgment: {
            approved:  { title: "Acknowledged", msg: "The caregiver has signed the overtime waiver.",                                    variant: "approved"  },
            rejected:  { title: "Declined",     msg: "The caregiver declined. An overtime mandate has been opened for admin review.",    variant: "rejected"  },
            cancelled: { title: "Cancelled",    msg: "This acknowledgment request was withdrawn or auto-voided.",                       variant: "cancelled" },
        },
        overtime_mandate: {
            approved:  { title: "Mandated",     msg: "Overtime has been mandated. The caregiver remains on shift and clock-in is unblocked.", variant: "approved"  },
            rejected:  { title: "Not Mandated", msg: "Overtime was not mandated. The caregiver has been removed from the shift.",             variant: "rejected"  },
            cancelled: { title: "Cancelled",    msg: "This mandate request was withdrawn or auto-voided.",                                    variant: "cancelled" },
        },
        banked_hours_payout: {
            approved:  { title: "Approved",  msg: "The payout has been approved and will be applied in the requested pay period.", variant: "approved"  },
            rejected:  { title: "Rejected",  msg: "The payout request was rejected.",                                             variant: "rejected"  },
            cancelled: { title: "Cancelled", msg: "This payout request was withdrawn or auto-voided.",                            variant: "cancelled" },
        },
    };
    const statusMap = maps[subjectType] ?? {
        approved:  { title: "Approved",  msg: "This certificate has been approved and is now active.", variant: "approved"  },
        rejected:  { title: "Rejected",  msg: "This certificate was rejected.",                        variant: "rejected"  },
        cancelled: { title: "Cancelled", msg: "This approval request was withdrawn or auto-voided.",   variant: "cancelled" },
    };
    return statusMap[status] ?? null;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

/**
 * ApprovalDetailPage  —  /approvals/[id]
 *
 * Renders the full detail view for a single approval request, regardless of type.
 * The left column shows type-specific context cards delegated to sub-components in
 * ./_components/. The right column shows the decision outcome and, for pending
 * approvals the current admin can act on, an inline action panel.
 *
 * Supported subject types:
 *   • caregiver_certificate    → CertificateApproval
 *   • overtime_acknowledgment  → AcknowledgmentDecision
 *   • overtime_mandate         → OvertimeMandate
 *   • banked_hours_payout      → BankedHoursPayout
 */
export default function ApprovalDetailPage() {

    // ── Route / navigation ────────────────────────────────────────────────────

    const { id } = useParams();
    const router = useRouter();

    // ── UI state ──────────────────────────────────────────────────────────────

    const [showApproveModal, setShowApproveModal] = useState(false);
    const [approveReason,    setApproveReason]    = useState("");

    const [showRejectForm,  setShowRejectForm]  = useState(false);
    const [rejectReason,    setRejectReason]    = useState("");
    const [rejectReasonErr, setRejectReasonErr] = useState("");

    // "approved" | "rejected" | null — drives the post-action success banner.
    const [actionSuccess, setActionSuccess] = useState(null);

    // Date-editing state lives here (not in CertificateApproval) so the approve
    // modal can read the draft values before the admin confirms.
    const [isEditingDates, setIsEditingDates] = useState(false);
    const [draftDates,     setDraftDates]     = useState({ startDate: "", expiryDate: "", renewalDate: "" });

    const [filePreviewError, setFilePreviewError] = useState(false);

    // ── Data hooks ────────────────────────────────────────────────────────────

    const {
        approvalDetail: approval,
        isLoading,
        fetchError,
        approve,
        reject,
        isApprovePending,
        isRejectPending,
        approveError,
        rejectError,
    } = useApprovals(id);

    const { profile } = useProfile();
    const permissionSlugs = profile?.permissionSlugs ?? [];

    const rawSubjectType = approval?.subjectType;

    // Each approval type maps to a different permission slug.
    const canDecide = rawSubjectType === "overtime_mandate"
        ? permissionSlugs.includes("update_shifts")
        : rawSubjectType === "banked_hours_payout"
        ? permissionSlugs.includes("manage_payroll")
        : permissionSlugs.includes("approve_all_certificates") ||
          permissionSlugs.includes("approve_assigned_certificates");

    // Must be called unconditionally (React Hooks rule) before any early return.
    // The `enabled` flag suppresses the network call when there is no admin to look
    // up — overtime_acknowledgment decisions are made by the caregiver on mobile.
    const decidedById = approval?.decision?.decidedBy;
    const { adminDetail: decidedByAdmin } = useAdmins({
        adminId: decidedById,
        enabled: !!decidedById && approval?.subjectType !== "overtime_acknowledgment",
    });

    // ── Loading / error guard ─────────────────────────────────────────────────

    if (isLoading || fetchError || !approval) {
        return (
            <PageLayout>
                <ErrorState
                    isLoading={isLoading || (!approval && !fetchError)}
                    errorMessage={fetchError}
                />
            </PageLayout>
        );
    }

    // ── Derived values ────────────────────────────────────────────────────────

    const { Icon: StatusIcon, label: statusLabel, className: statusClass } =
        STATUS_META[approval.status] ?? STATUS_META.pending;

    const isPending   = approval.status === "pending";
    const isDecided   = approval.status === "approved" || approval.status === "rejected";
    const subjectType = approval.subjectType;
    const banner      = getBannerMeta(approval.status, subjectType);

    const subjectContext  = approval.subjectContext ?? {};
    const caregiverName   = subjectContext.caregiverName  ?? "—";
    const certificateName = formatCertName(subjectContext.certificateName);
    const fileUrl         = subjectContext.fileUrl ?? null;
    const canViewFile     = !!fileUrl && (approval.status === "pending" || approval.status === "approved");

    // overtime_acknowledgment is decided by the caregiver on mobile — use their
    // name from context rather than looking up an admin record.
    const decidedByName = subjectType === "overtime_acknowledgment"
        ? caregiverName
        : decidedByAdmin
            ? `${decidedByAdmin.firstName ?? ""} ${decidedByAdmin.lastName ?? ""}`.trim() || decidedByAdmin.email
            : decidedById ?? "—";

    // ── Handlers ─────────────────────────────────────────────────────────────

    /** Populate draftDates from the existing cert context and enter edit mode. */
    const handleStartEditDates = () => {
        setDraftDates({
            startDate:   toDateInput(subjectContext.startDate),
            expiryDate:  toDateInput(subjectContext.expiryDate),
            renewalDate: toDateInput(subjectContext.renewalDate),
        });
        setIsEditingDates(true);
    };

    /** Exit date edit mode and discard any draft changes. */
    const handleCancelEditDates = () => {
        setIsEditingDates(false);
        setDraftDates({ startDate: "", expiryDate: "", renewalDate: "" });
    };

    /**
     * Submit the approve action. If the admin edited certificate dates, appends
     * those overrides to the payload so the API records the corrected values.
     */
    const handleApprove = async () => {
        try {
            const overrides = {};
            if (isEditingDates) {
                if (draftDates.startDate)   overrides.startDate   = draftDates.startDate;
                if (draftDates.expiryDate)  overrides.expiryDate  = draftDates.expiryDate;
                if (draftDates.renewalDate) overrides.renewalDate = draftDates.renewalDate;
            }
            await approve({ id, reason: approveReason.trim() || undefined, ...overrides });
            setShowApproveModal(false);
            setApproveReason("");
            setIsEditingDates(false);
            setDraftDates({ startDate: "", expiryDate: "", renewalDate: "" });
            setActionSuccess("approved");
        } catch (_) {
            // approveError is populated by React Query and rendered inside the modal.
        }
    };

    /**
     * Validate the reject reason and submit the reject action.
     * A written reason is always required before the request goes through.
     */
    const handleReject = async () => {
        if (!rejectReason.trim()) {
            setRejectReasonErr("Please provide a reason for rejection.");
            return;
        }
        try {
            await reject({ id, reason: rejectReason.trim() });
            setShowRejectForm(false);
            setRejectReason("");
            setRejectReasonErr("");
            setActionSuccess("rejected");
        } catch (_) {
            // rejectError is populated by React Query and rendered inline.
        }
    };

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <PageLayout>

            {/* ── Page header ────────────────────────────────────────────── */}
            <div className={styles.pageHeader}>
                <div className={styles.headerLeft}>
                    <div className={styles.statusRow}>
                        {subjectType === "overtime_acknowledgment" ? (
                            <span className={`${styles.subjectTypePill} ${styles.subjectTypePillOrange}`}>
                                <Timer size={12} />
                                Overtime Acknowledgment
                            </span>
                        ) : subjectType === "overtime_mandate" ? (
                            <span className={`${styles.subjectTypePill} ${styles.subjectTypePillRed}`}>
                                <Scale size={12} />
                                Overtime Mandate
                            </span>
                        ) : subjectType === "banked_hours_payout" ? (
                            <span className={`${styles.subjectTypePill} ${styles.subjectTypePillGreen}`}>
                                <Banknote size={12} />
                                Hours Payout
                            </span>
                        ) : (
                            <span className={styles.subjectTypePill}>
                                <Award size={12} />
                                Certificate Approval
                            </span>
                        )}
                        <span className={`${styles.statusBadge} ${styles[statusClass]}`}>
                            <StatusIcon size={12} />
                            {statusLabel}
                        </span>
                    </div>
                    <h1>Approval Request</h1>
                    <div className={styles.headerMeta}>
                        <CalendarDays size={13} />
                        <span>Requested <strong>{formatDateTime(approval.createdAt)}</strong></span>
                        {approval.updatedAt && approval.updatedAt !== approval.createdAt && (
                            <>
                                <span className={styles.metaSep}>·</span>
                                <Clock size={13} />
                                <span>Updated <strong>{formatDateTime(approval.updatedAt)}</strong></span>
                            </>
                        )}
                    </div>
                </div>
                <div className={styles.headerActions}>
                    <Button icon={<Undo2 size={16} />} onClick={() => router.back()} variant="secondary">
                        Back
                    </Button>
                </div>
            </div>

            {/* ── Post-action success feedback ───────────────────────────── */}
            <ActionMessage
                variant="success"
                message={
                    actionSuccess === "approved" ? (
                        subjectType === "overtime_mandate"    ? "Overtime mandated successfully."  :
                        subjectType === "banked_hours_payout" ? "Payout approved."                 :
                        "Certificate approved successfully."
                    ) : actionSuccess === "rejected" ? (
                        subjectType === "overtime_mandate"    ? "Caregiver removed from the shift." :
                        subjectType === "banked_hours_payout" ? "Payout request rejected."          :
                        "Certificate rejected."
                    ) : null
                }
                onClose={() => setActionSuccess(null)}
            />

            {/* ── Decided / cancelled status banner ─────────────────────── */}
            {banner && (
                <div className={`${styles.decidedBanner} ${styles[`decidedBanner_${banner.variant}`]}`}>
                    {banner.variant === "approved"  && <CheckCircle2 size={18} className={styles[`decidedBannerIcon_${banner.variant}`]} />}
                    {banner.variant === "rejected"  && <XCircle      size={18} className={styles[`decidedBannerIcon_${banner.variant}`]} />}
                    {banner.variant === "cancelled" && <Ban          size={18} className={styles[`decidedBannerIcon_${banner.variant}`]} />}
                    <div className={styles.decidedBannerBody}>
                        <span className={styles.decidedBannerTitle}>{banner.title}</span>
                        <span className={styles.decidedBannerMsg}>{banner.msg}</span>
                    </div>
                </div>
            )}

            {/* ── Main 2-column grid ─────────────────────────────────────── */}
            <div className={styles.mainGrid}>

                {/* ── LEFT: Request metadata + type-specific subject cards ── */}
                <div className={styles.col}>

                    {/* Submission metadata — who requested, role, type, category, timestamp */}
                    <Card>
                        <CardHeader>
                            <span className={styles.cardTitleInner}>
                                <ClipboardCheck size={15} />
                                Request Details
                            </span>
                        </CardHeader>
                        <CardContent>
                            <InfoField label="Requested By">
                                <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                                    <User size={14} style={{ color: "#9ca3af" }} />
                                    {approval.requestedByRole === "caregiver" ? caregiverName : "Admin"}
                                </span>
                            </InfoField>
                            <InfoField label="Role">
                                <span style={{ textTransform: "capitalize" }}>
                                    {approval.requestedByRole ?? "—"}
                                </span>
                            </InfoField>
                            <InfoField label="Type">
                                <span>
                                    {approval.subjectType?.replace(/_/g, " ").replace(/\b\w/g, character => character.toUpperCase()) ?? "—"}
                                </span>
                            </InfoField>
                            <InfoField label="Category">
                                <span style={{ textTransform: "capitalize" }}>
                                    {approval.display?.category ?? "—"}
                                </span>
                            </InfoField>
                            <InfoField label="Submitted">
                                {formatDateTime(approval.createdAt)}
                            </InfoField>
                        </CardContent>
                    </Card>

                    {/* caregiver_certificate — document preview + editable cert dates */}
                    {subjectType === "caregiver_certificate" && (
                        <CertificateApproval
                            approval={approval}
                            caregiverName={caregiverName}
                            certificateName={certificateName}
                            fileUrl={fileUrl}
                            canViewFile={canViewFile}
                            canDecide={canDecide}
                            isPending={isPending}
                            isEditingDates={isEditingDates}
                            draftDates={draftDates}
                            filePreviewError={filePreviewError}
                            onSetFilePreviewError={setFilePreviewError}
                            onSetDraftDates={setDraftDates}
                            onStartEditDates={handleStartEditDates}
                            onCancelEditDates={handleCancelEditDates}
                            onNavigateCaregiver={() => router.push(`/caregivers/${approval.subjectParentId}`)}
                            subjectContext={subjectContext}
                        />
                    )}

                    {/* overtime_acknowledgment — caregiver, shift timing, waiver statement */}
                    {subjectType === "overtime_acknowledgment" && (
                        <AcknowledgmentDecision subjectContext={subjectContext} />
                    )}

                    {/* overtime_mandate — caregiver, shift link, overage, review context note */}
                    {subjectType === "overtime_mandate" && (
                        <OvertimeMandate
                            subjectContext={subjectContext}
                            caregiverName={caregiverName}
                            subjectId={approval.subjectId}
                            onNavigateShift={() => router.push(`/scheduling/${approval.subjectId}`)}
                        />
                    )}

                    {/* banked_hours_payout — requested hours, pay period, balance at request */}
                    {subjectType === "banked_hours_payout" && (
                        <BankedHoursPayout
                            subjectContext={subjectContext}
                            caregiverName={caregiverName}
                        />
                    )}

                </div>

                {/* ── RIGHT: Decision outcome + Actions panel ──────────────── */}
                <div className={styles.col}>

                    {/* Who decided, when, and the reason they provided */}
                    <Card>
                        <CardHeader>
                            <span className={styles.cardTitleInner}>
                                <ShieldCheck size={15} />
                                Decision
                            </span>
                        </CardHeader>
                        <CardContent>
                            {!isDecided ? (
                                <div className={styles.decisionPending}>
                                    <div className={styles.decisionPendingIcon}>
                                        <Clock size={22} />
                                    </div>
                                    <p className={styles.decisionPendingTitle}>Awaiting Decision</p>
                                    <p className={styles.decisionPendingBody}>
                                        {subjectType === "overtime_acknowledgment"
                                            ? "Awaiting the caregiver's acknowledgment on mobile."
                                            : "No decision has been made yet. Eligible admins may approve or reject below."}
                                    </p>
                                </div>
                            ) : (
                                <div className={styles.decisionGrid}>
                                    <InfoField label="Decided By">
                                        {decidedByName}
                                    </InfoField>
                                    <InfoField label="Decided At">
                                        {formatDateTime(approval.decision?.decidedAt)}
                                    </InfoField>
                                    {approval.decision?.reason && (
                                        <InfoField label="Reason">
                                            <div className={styles.decisionReasonBox}>
                                                {approval.decision.reason}
                                            </div>
                                        </InfoField>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Actions — only visible to admins with the required permission on pending approvals.
                        overtime_acknowledgment is decided by the caregiver on mobile — no admin action here. */}
                    {isPending && canDecide && subjectType !== "overtime_acknowledgment" && (
                        <Card>
                            <CardHeader>
                                <span className={styles.cardTitleInner}>
                                    <CheckCircle2 size={15} />
                                    Actions
                                </span>
                            </CardHeader>
                            <CardContent>
                                <div className={styles.actionPanel}>
                                    <p style={{ fontSize: "0.85rem", color: "#6b7280", margin: 0 }}>
                                        {subjectType === "overtime_mandate"
                                            ? "Mandate the overtime to keep the caregiver on shift, or decline to remove them. Either action is final."
                                            : subjectType === "banked_hours_payout"
                                            ? "Review the banked hours payout request. Rejection requires a written reason."
                                            : "Review the certificate submission above and make a decision. Rejection requires a written reason."}
                                    </p>

                                    {/* Approve / open-reject buttons */}
                                    {!showRejectForm && (
                                        <div className={styles.actionBtns}>
                                            <Button
                                                variant="primary"
                                                icon={<CheckCircle2 size={15} />}
                                                onClick={() => setShowApproveModal(true)}
                                            >
                                                {subjectType === "overtime_mandate"    ? "Mandate"        :
                                                 subjectType === "banked_hours_payout" ? "Approve Payout" :
                                                 "Approve"}
                                            </Button>
                                            <Button
                                                variant="danger"
                                                icon={<XCircle size={15} />}
                                                onClick={() => setShowRejectForm(true)}
                                            >
                                                {subjectType === "overtime_mandate" ? "Remove from Shift" : "Reject"}
                                            </Button>
                                        </div>
                                    )}

                                    {/* Inline reject form */}
                                    {showRejectForm && (
                                        <div className={styles.rejectForm}>
                                            <label className={styles.rejectLabel}>
                                                {subjectType === "overtime_mandate" ? "Reason for removal" : "Reason for rejection"}
                                                <span>*</span>
                                            </label>
                                            {subjectType === "overtime_mandate" && (
                                                <div className={styles.rejectWarn}>
                                                    <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                                                    The caregiver will be automatically unassigned from this shift.
                                                </div>
                                            )}
                                            <textarea
                                                className={`${styles.rejectTextarea} ${rejectReasonErr ? styles.rejectTextareaError : ""}`}
                                                rows={3}
                                                placeholder={
                                                    subjectType === "overtime_mandate"
                                                        ? "Explain why the caregiver is being removed from this shift…"
                                                        : subjectType === "banked_hours_payout"
                                                        ? "Explain why this payout request is being rejected…"
                                                        : "Explain why this certificate is being rejected…"
                                                }
                                                value={rejectReason}
                                                onChange={(e) => {
                                                    setRejectReason(e.target.value);
                                                    if (e.target.value.trim()) setRejectReasonErr("");
                                                }}
                                            />
                                            {rejectReasonErr && (
                                                <span className={styles.rejectErrorMsg}>{rejectReasonErr}</span>
                                            )}
                                            <ActionMessage variant="error" message={rejectError} />
                                            <div className={styles.rejectActions}>
                                                <Button
                                                    variant="secondary"
                                                    onClick={() => {
                                                        setShowRejectForm(false);
                                                        setRejectReason("");
                                                        setRejectReasonErr("");
                                                    }}
                                                    disabled={isRejectPending}
                                                >
                                                    Cancel
                                                </Button>
                                                <Button
                                                    variant="danger"
                                                    icon={isRejectPending
                                                        ? <Loader size={14} className={styles.spinnerIcon} />
                                                        : <XCircle size={14} />
                                                    }
                                                    disabled={isRejectPending}
                                                    onClick={handleReject}
                                                >
                                                    {isRejectPending
                                                        ? "Submitting…"
                                                        : subjectType === "overtime_mandate"
                                                        ? "Confirm Remove"
                                                        : "Confirm Reject"}
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                </div>
            </div>

            {/* ── Approve confirmation modal ─────────────────────────────── */}
            <Modal isOpen={showApproveModal} onClose={() => { setShowApproveModal(false); setApproveReason(""); }}>
                <div className={styles.approveModal}>
                    <div className={styles.approveModalIcon}>
                        <CheckCircle2 size={28} strokeWidth={1.5} />
                    </div>
                    <h2 className={styles.approveModalTitle}>
                        {subjectType === "overtime_mandate"    ? "Mandate Overtime" :
                         subjectType === "banked_hours_payout" ? "Approve Payout"   :
                         "Approve Certificate"}
                    </h2>
                    <p className={styles.approveModalDesc}>
                        {subjectType === "overtime_mandate"
                            ? `${caregiverName} will remain assigned to the shift. Their overage will be recorded as overtime pay and clock-in will unblock.`
                            : subjectType === "banked_hours_payout"
                            ? "The requested hours will be paid out in the specified pay period."
                            : "Are you sure you want to approve this? Please verify the issue and expiry dates are correct before confirming."}
                    </p>

                    {/* caregiver_certificate — verify dates before confirming; drafts shown if admin edited them */}
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

                    {/* banked_hours_payout — confirm the amount and target period before approving */}
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

                    <div className={styles.approveReasonField}>
                        <label className={styles.approveReasonLabel}>
                            Note (optional)
                        </label>
                        <textarea
                            className={styles.approveReasonTextarea}
                            rows={2}
                            placeholder="Add an optional note…"
                            value={approveReason}
                            onChange={(e) => setApproveReason(e.target.value)}
                        />
                    </div>

                    <div className={styles.approveModalActions}>
                        <Button
                            variant="secondary"
                            onClick={() => { setShowApproveModal(false); setApproveReason(""); }}
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
                            onClick={handleApprove}
                        >
                            {isApprovePending ? "Submitting…"  :
                             subjectType === "overtime_mandate"    ? "Confirm Mandate" :
                             subjectType === "banked_hours_payout" ? "Confirm Payout"  :
                             "Confirm Approve"}
                        </Button>
                    </div>
                </div>
            </Modal>

        </PageLayout>
    );
}
