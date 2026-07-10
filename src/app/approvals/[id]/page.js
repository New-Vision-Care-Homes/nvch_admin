"use client";

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
	FileText,
	CheckCircle2,
	XCircle,
	Clock,
	CalendarDays,
	Loader,
	Award,
	ShieldCheck,
	Ban,
	ExternalLink,
	Lock,
	Pencil,
	AlertTriangle,
} from "lucide-react";
import styles from "./approval_detail.module.css";
import { formatDateTime, formatDateOnly, toDateInput } from "@/utils/dates";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCertName(raw) {
	if (!raw) return "—";
	return raw.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const STATUS_META = {
	pending:   { label: "Pending",   className: "status_pending",   Icon: Clock         },
	approved:  { label: "Approved",  className: "status_approved",  Icon: CheckCircle2  },
	rejected:  { label: "Rejected",  className: "status_rejected",  Icon: XCircle       },
	cancelled: { label: "Cancelled", className: "status_cancelled", Icon: Ban           },
};

const BANNER_META = {
	approved:  { title: "Approved",  msg: "This certificate has been approved and is now active.", variant: "approved"  },
	rejected:  { title: "Rejected",  msg: "This certificate was rejected.",                        variant: "rejected"  },
	cancelled: { title: "Cancelled", msg: "This approval request was withdrawn or auto-voided.",   variant: "cancelled" },
};

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function ApprovalDetailPage() {
	const { id } = useParams();
	const router = useRouter();

	const [showApproveModal, setShowApproveModal] = useState(false);
	const [approveReason,    setApproveReason]    = useState("");

	const [showRejectForm, setShowRejectForm] = useState(false);
	const [rejectReason,   setRejectReason]   = useState("");
	const [rejectReasonErr, setRejectReasonErr] = useState("");

	const [actionSuccess, setActionSuccess] = useState(null); // "approved" | "rejected"

	const [isEditingDates, setIsEditingDates] = useState(false);
	const [draftDates, setDraftDates] = useState({ startDate: "", expiryDate: "", renewalDate: "" });
	const [filePreviewError, setFilePreviewError] = useState(false);

	const { profile } = useProfile();
	const permissionSlugs = profile?.permissionSlugs ?? [];
	const canDecide =
		permissionSlugs.includes("approve_all_certificates") ||
		permissionSlugs.includes("approve_assigned_certificates");

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

	// Must be called unconditionally before any early return.
	const decidedById = approval?.decision?.decidedBy;
	const { adminDetail: decidedByAdmin } = useAdmins({ adminId: decidedById, enabled: !!decidedById });

	// ── Loading / error guard ──────────────────────────────────────────────────
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

	const { Icon: StatusIcon, label: statusLabel, className: statusClass } =
		STATUS_META[approval.status] ?? STATUS_META.pending;

	const isPending  = approval.status === "pending";
	const isDecided  = approval.status === "approved" || approval.status === "rejected";
	const banner     = BANNER_META[approval.status];

	const ctx        = approval.subjectContext ?? {};
	const caregiverName  = ctx.caregiverName  ?? "—";
	const certificateName = formatCertName(ctx.certificateName);
	const fileUrl     = ctx.fileUrl ?? null;
	const canViewFile = !!fileUrl && (approval.status === "pending" || approval.status === "approved");
	const decidedByName = decidedByAdmin
		? `${decidedByAdmin.firstName ?? ""} ${decidedByAdmin.lastName ?? ""}`.trim() || decidedByAdmin.email
		: decidedById ?? "—";

	// ── Date edit handlers ─────────────────────────────────────────────────────
	const handleStartEditDates = () => {
		setDraftDates({
			startDate:   toDateInput(ctx.startDate),
			expiryDate:  toDateInput(ctx.expiryDate),
			renewalDate: toDateInput(ctx.renewalDate),
		});
		setIsEditingDates(true);
	};

	const handleCancelEditDates = () => {
		setIsEditingDates(false);
		setDraftDates({ startDate: "", expiryDate: "", renewalDate: "" });
	};

	// ── Approve handler ────────────────────────────────────────────────────────
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
			// approveError is populated by React Query and shown in the modal
		}
	};

	// ── Reject handler ─────────────────────────────────────────────────────────
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
			// rejectError is populated by React Query and shown inline
		}
	};

	return (
		<PageLayout>

			{/* ── Page header ────────────────────────────────────────────── */}
			<div className={styles.pageHeader}>
				<div className={styles.headerLeft}>
					<div className={styles.statusRow}>
						<span className={styles.subjectTypePill}>
							<Award size={12} />
							Certificate Approval
						</span>
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

			{/* ── Success feedback ───────────────────────────────────────── */}
			<ActionMessage
				variant="success"
				message={
					actionSuccess === "approved" ? "Certificate approved successfully." :
					actionSuccess === "rejected" ? "Certificate rejected."              : null
				}
				onClose={() => setActionSuccess(null)}
			/>

			{/* ── Decided / cancelled banner ─────────────────────────────── */}
			{banner && (
				<div className={`${styles.decidedBanner} ${styles[`decidedBanner_${banner.variant}`]}`}>
					{banner.variant === "approved"  && <CheckCircle2 size={18} className={styles[`decidedBannerIcon_${banner.variant}`]} />}
					{banner.variant === "rejected"  && <XCircle      size={18} className={styles[`decidedBannerIcon_${banner.variant}`]} />}
					{banner.variant === "cancelled" && <Ban           size={18} className={styles[`decidedBannerIcon_${banner.variant}`]} />}
					<div className={styles.decidedBannerBody}>
						<span className={styles.decidedBannerTitle}>{banner.title}</span>
						<span className={styles.decidedBannerMsg}>{banner.msg}</span>
					</div>
				</div>
			)}

			{/* ── Main 2-column grid ─────────────────────────────────────── */}
			<div className={styles.mainGrid}>

				{/* ── LEFT: Request details + Subject ─────────────────────── */}
				<div className={styles.col}>

					{/* Request Details */}
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
									{approval.subjectType?.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) ?? "—"}
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

					{approval.status === "approved" && approval.subjectParentId ? (
						/* ── Approved: replace docs + dates with a caregiver profile link ── */
						<button
							className={styles.caregiverProfileLink}
							onClick={() => router.push(`/caregivers/${approval.subjectParentId}`)}
						>
							<div className={styles.caregiverProfileLinkIcon}>
								<User size={20} color="#7c3aed" />
							</div>
							<div className={styles.caregiverProfileLinkBody}>
								<span className={styles.caregiverProfileLinkName}>{caregiverName}</span>
								<span className={styles.caregiverProfileLinkHint}>View caregiver profile for up-to-date certificate info</span>
							</div>
							<ExternalLink size={15} className={styles.caregiverProfileLinkArrow} />
						</button>
					) : (
						<>
							{/* Subject — Caregiver & Certificate */}
							<Card>
								<CardHeader
									actions={canViewFile && (
										<a href={fileUrl} target="_blank" rel="noopener noreferrer" className={styles.fileViewFullLink}>
											Open <ExternalLink size={12} />
										</a>
									)}
								>
									<span className={styles.cardTitleInner}>
										<FileText size={15} />
										Documents
									</span>
								</CardHeader>
								<CardContent>
									<div className={styles.subjectBlock}>
										<div className={styles.subjectRow}>
											<div className={styles.subjectIconBox}>
												<User size={16} color="#7c3aed" />
											</div>
											<div className={styles.subjectRowBody}>
												<span className={styles.subjectRowLabel}>Caregiver</span>
												<span className={styles.subjectRowValue}>{caregiverName}</span>
											</div>
										</div>
										{fileUrl ? (
											<div className={`${styles.subjectRow} ${canViewFile ? "" : styles.subjectRowLocked}`}>
												<div className={styles.subjectIconBox}>
													<Award size={16} color={canViewFile ? "#7c3aed" : "#9ca3af"} />
												</div>
												<div className={styles.subjectRowBody}>
													<span className={styles.subjectRowLabel}>Certificate</span>
													<span className={`${styles.subjectRowValue} ${canViewFile ? "" : styles.subjectRowValueLocked}`}>{certificateName}</span>
												</div>
												{!canViewFile && <Lock size={13} className={styles.subjectRowLockIcon} />}
											</div>
										) : (
											<div className={styles.subjectRow}>
												<div className={styles.subjectIconBox}>
													<Award size={16} color="#7c3aed" />
												</div>
												<div className={styles.subjectRowBody}>
													<span className={styles.subjectRowLabel}>Certificate</span>
													<span className={styles.subjectRowValue}>{certificateName}</span>
												</div>
											</div>
										)}
									</div>

									{/* Inline file preview */}
									{canViewFile && (
										filePreviewError ? (
											<div className={styles.fileFallback}>
												<FileText size={32} color="#d1d5db" />
												<p className={styles.fileFallbackText}>Preview not available for this file type</p>
												<a href={fileUrl} target="_blank" rel="noopener noreferrer" className={styles.fileFallbackLink}>
													<ExternalLink size={14} />
													Open Document
												</a>
											</div>
										) : (
											<a href={fileUrl} target="_blank" rel="noopener noreferrer" className={styles.fileImageWrap}>
												<img
													src={fileUrl}
													alt={certificateName}
													className={styles.fileImage}
													onError={() => setFilePreviewError(true)}
												/>
												<div className={styles.fileImageOverlay}>
													<ExternalLink size={18} />
													Open full view
												</div>
											</a>
										)
									)}
								</CardContent>
							</Card>

							{/* Certificate Dates */}
							{approval.subjectType === "caregiver_certificate" && approval.status !== "rejected" && (
								<Card>
									<CardHeader
										actions={isPending && canDecide && (
											isEditingDates ? (
												<Button
													variant="secondary"
													size="sm"
													icon={<XCircle size={13} />}
													onClick={handleCancelEditDates}
												>
													Cancel
												</Button>
											) : (
												<Button
													variant="ghostPill"
													size="sm"
													icon={<Pencil size={13} />}
													onClick={handleStartEditDates}
												>
													Edit
												</Button>
											)
										)}
									>
										<span className={styles.cardTitleInner}>
											<CalendarDays size={15} />
											Certificate Dates
										</span>
									</CardHeader>
									<CardContent>
										{isEditingDates ? (
											<div className={styles.datesEditGrid}>
												<div className={styles.dateField}>
													<label className={styles.dateFieldLabel}>Issue Date</label>
													<input
														type="date"
														className={styles.dateInput}
														value={draftDates.startDate}
														onChange={(e) => setDraftDates(d => ({ ...d, startDate: e.target.value }))}
													/>
												</div>
												<div className={styles.dateField}>
													<label className={styles.dateFieldLabel}>Expiry Date</label>
													<input
														type="date"
														className={styles.dateInput}
														value={draftDates.expiryDate}
														onChange={(e) => setDraftDates(d => ({ ...d, expiryDate: e.target.value }))}
													/>
												</div>
												<div className={styles.dateField}>
													<label className={styles.dateFieldLabel}>
														Renewal Date
														<span className={styles.dateFieldOptional}> (optional)</span>
													</label>
													<input
														type="date"
														className={styles.dateInput}
														value={draftDates.renewalDate}
														onChange={(e) => setDraftDates(d => ({ ...d, renewalDate: e.target.value }))}
													/>
												</div>
											</div>
										) : (
											<>
												<InfoField label="Issue Date">{formatDateOnly(ctx.startDate)}</InfoField>
												<InfoField label="Expiry Date">{formatDateOnly(ctx.expiryDate)}</InfoField>
												<InfoField label="Renewal Date">{formatDateOnly(ctx.renewalDate)}</InfoField>
											</>
										)}
									</CardContent>
								</Card>
							)}
						</>
					)}

				</div>

				{/* ── RIGHT: Decision + Actions ────────────────────────────── */}
				<div className={styles.col}>

					{/* Decision */}
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
										No decision has been made yet. Eligible admins may approve or reject below.
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

					{/* Actions — only show if pending and the admin has a certificate-approval slug */}
					{isPending && canDecide && (
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
										Review the certificate submission above and make a decision.
										Rejection requires a written reason.
									</p>

									{/* Approve / open-reject buttons */}
									{!showRejectForm && (
										<div className={styles.actionBtns}>
											<Button
												variant="primary"
												icon={<CheckCircle2 size={15} />}
												onClick={() => setShowApproveModal(true)}
											>
												Approve
											</Button>
											<Button
												variant="danger"
												icon={<XCircle size={15} />}
												onClick={() => setShowRejectForm(true)}
											>
												Reject
											</Button>
										</div>
									)}

									{/* Inline reject form */}
									{showRejectForm && (
										<div className={styles.rejectForm}>
											<label className={styles.rejectLabel}>
												Reason for rejection
												<span>*</span>
											</label>
											<textarea
												className={`${styles.rejectTextarea} ${rejectReasonErr ? styles.rejectTextareaError : ""}`}
												rows={3}
												placeholder="Explain why this certificate is being rejected…"
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
													{isRejectPending ? "Rejecting…" : "Confirm Reject"}
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
					<h2 className={styles.approveModalTitle}>Approve Certificate</h2>
					<p className={styles.approveModalDesc}>
						Are you sure you want to approve this? Please verify the issue and
						expiry dates are correct before confirming.
					</p>

					{/* Dates check */}
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
										: formatDateOnly(ctx.startDate)}
								</span>
							</div>
							<div className={styles.approveModalDatesCheckRow}>
								<span className={styles.approveModalDatesCheckLabel}>Expiry Date</span>
								<span className={styles.approveModalDatesCheckValue}>
									{isEditingDates && draftDates.expiryDate
										? formatDateOnly(draftDates.expiryDate)
										: formatDateOnly(ctx.expiryDate)}
								</span>
							</div>
							{(isEditingDates ? draftDates.renewalDate : ctx.renewalDate) && (
								<div className={styles.approveModalDatesCheckRow}>
									<span className={styles.approveModalDatesCheckLabel}>Renewal Date</span>
									<span className={styles.approveModalDatesCheckValue}>
										{isEditingDates && draftDates.renewalDate
											? formatDateOnly(draftDates.renewalDate)
											: formatDateOnly(ctx.renewalDate)}
									</span>
								</div>
							)}
						</div>
					</div>

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
							{isApprovePending ? "Approving…" : "Confirm Approve"}
						</Button>
					</div>
				</div>
			</Modal>

		</PageLayout>
	);
}
