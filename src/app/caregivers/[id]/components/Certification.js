"use client";

import React, { useState } from "react";
import styles from "./Certification.module.css";
import { Trash2, Upload, Eye, ExternalLink, CheckCircle2, XCircle, Loader, AlertTriangle } from "lucide-react";
import Button from "@components/UI/Button";
import IconButton from "@components/UI/IconButton";
import Modal from "@components/UI/Modal";
import { Table, TableHeader, TableContent, TableCell } from "@components/UI/Table";
import ActionMessage from "@components/UI/ActionMessage";
import ErrorState from "@components/UI/ErrorState";
import { useParams } from "next/navigation";
import { formatDateOnly, toDateInput } from "@/utils/dates";
import { useCaregivers } from "@/hooks/useCaregivers";
import { useCertificates } from "@/hooks/useCertificates";
import { useApprovals } from "@/hooks/useApprovals";
import { CERTIFICATE_OPTIONS } from "@/utils/dropdown_list";
import CertificateModal from "@components/UI/CertificateModal";

export default function Certification() {
	const { id: userId } = useParams();

	const { caregiverDetail, isCaregiverLoading, caregiverFetchError, refetchDetail: refetchCaregiver } = useCaregivers(userId);
	const { deleteCertificate: deleteCert, isCertificateDeleting: isDeleting } = useCertificates(userId);

	const {
		approvals,
		approve,
		reject,
		isApprovePending,
		isRejectPending,
		approveError,
		rejectError,
	} = useApprovals({ params: { limit: 200 }, fetchQueue: true });

	// Map certificate _id → pending approval for fast lookup
	const certIdToApproval = approvals.reduce((map, a) => {
		if (a.subjectId) map[a.subjectId] = a;
		return map;
	}, {});

	// ── State ──────────────────────────────────────────────────────────────────
	const [isModalOpen,     setIsModalOpen]     = useState(false);
	const [showDeleteModal, setShowDeleteModal]  = useState(false);
	const [targetCertId,    setTargetCertId]     = useState(null);

	const [showApproveModal,  setShowApproveModal]  = useState(false);
	const [approveReason,     setApproveReason]     = useState("");
	const [targetApproval,    setTargetApproval]    = useState(null);
	const [approveModalDates, setApproveModalDates] = useState({ startDate: "", expiryDate: "", renewalDate: "" });

	const [showRejectModal, setShowRejectModal] = useState(false);
	const [rejectReason,    setRejectReason]    = useState("");
	const [rejectReasonErr, setRejectReasonErr] = useState("");
	const [targetRejectId,  setTargetRejectId]  = useState(null);

	const [actionMsg, setActionMsg] = useState(null);

	const certifications = caregiverDetail?.certifications || [];

	// ── Delete handlers ────────────────────────────────────────────────────────
	const handleDeleteClick = (certId) => {
		setTargetCertId(certId);
		setShowDeleteModal(true);
	};

	const confirmDelete = () => {
		if (!targetCertId) return;
		deleteCert(targetCertId, {
			onSuccess: () => {
				setShowDeleteModal(false);
				setTargetCertId(null);
				setActionMsg({ variant: "success", text: "Certificate deleted successfully." });
			},
			onError: (err) => setActionMsg({ variant: "danger", text: `Delete failed: ${err.message}` }),
		});
	};

	// ── Approve handlers ───────────────────────────────────────────────────────
	const handleApproveClick = (approval) => {
		setTargetApproval(approval);
		setApproveReason("");
		setApproveModalDates({
			startDate:   toDateInput(approval.subjectContext?.startDate),
			expiryDate:  toDateInput(approval.subjectContext?.expiryDate),
			renewalDate: toDateInput(approval.subjectContext?.renewalDate),
		});
		setShowApproveModal(true);
	};

	const closeApproveModal = () => {
		setShowApproveModal(false);
		setApproveReason("");
		setTargetApproval(null);
		setApproveModalDates({ startDate: "", expiryDate: "", renewalDate: "" });
	};

	const confirmApprove = async () => {
		try {
			const body = { id: targetApproval._id, reason: approveReason.trim() || undefined };
			if (approveModalDates.startDate)   body.startDate   = approveModalDates.startDate;
			if (approveModalDates.expiryDate)  body.expiryDate  = approveModalDates.expiryDate;
			if (approveModalDates.renewalDate) body.renewalDate = approveModalDates.renewalDate;
			await approve(body);
			await refetchCaregiver();
			closeApproveModal();
			setActionMsg({ variant: "success", text: "Certificate approved successfully." });
		} catch (_) {}
	};

	// ── Reject handlers ────────────────────────────────────────────────────────
	const handleRejectClick = (approvalId) => {
		setTargetRejectId(approvalId);
		setRejectReason("");
		setRejectReasonErr("");
		setShowRejectModal(true);
	};

	const confirmReject = async () => {
		if (!rejectReason.trim()) {
			setRejectReasonErr("Please provide a reason for rejection.");
			return;
		}
		try {
			await reject({ id: targetRejectId, reason: rejectReason.trim() });
			await refetchCaregiver();
			setShowRejectModal(false);
			setTargetRejectId(null);
			setRejectReason("");
			setRejectReasonErr("");
			setActionMsg({ variant: "success", text: "Certificate rejected." });
		} catch (_) {}
	};

	return (
		<div className={styles.container}>
			<div className={styles.toolbar}>
				<Button onClick={() => setIsModalOpen(true)} icon={<Upload size={14} />}>
					Upload Certificate
				</Button>
			</div>

			{actionMsg && (
				<div style={{ marginBottom: "1rem" }}>
					<ActionMessage variant={actionMsg.variant} message={actionMsg.text} onClose={() => setActionMsg(null)} />
				</div>
			)}

			{/* Desktop table */}
			<div className={styles.desktopTable}>
				<Table>
					<TableHeader>
						<TableCell>Name</TableCell>
						<TableCell>Issue Date</TableCell>
						<TableCell>Expiry Date</TableCell>
						<TableCell>Renewal Date</TableCell>
						<TableCell>Status</TableCell>
						<TableCell>Document</TableCell>
						<TableCell>Action</TableCell>
					</TableHeader>

					{isCaregiverLoading ? (
						<TableContent>
							<TableCell colSpan={7} style={{ padding: "0" }}>
								<ErrorState isLoading={true} />
							</TableCell>
						</TableContent>
					) : caregiverFetchError ? (
						<TableContent>
							<TableCell colSpan={7} style={{ padding: "0" }}>
								<ErrorState errorMessage={caregiverFetchError} />
							</TableCell>
						</TableContent>
					) : certifications.length === 0 ? (
						<TableContent>
							<TableCell colSpan={7} style={{ textAlign: "center", padding: "2rem" }}>
								No certifications found.
							</TableCell>
						</TableContent>
					) : (
						certifications.map((c) => {
							const option = CERTIFICATE_OPTIONS.find((opt) => opt.value === c.name);
							const friendlyName = option ? option.label : c.name;
							const pendingApproval = certIdToApproval[c._id];

							return (
								<TableContent key={c._id}>
									<TableCell style={{ fontWeight: 600 }}>{friendlyName}</TableCell>
									<TableCell>{formatDateOnly(c.startDate)}</TableCell>
									<TableCell>{formatDateOnly(c.expiryDate)}</TableCell>
									<TableCell>{formatDateOnly(c.renewalDate)}</TableCell>
									<TableCell>
										{pendingApproval ? (
											<span className={styles.statusPill} style={{ background: "#fef3c7", color: "#92400e", border: "1px solid #fcd34d" }}>
												Pending Review
											</span>
										) : (
											<span className={`${styles.statusPill} ${c.isActive ? styles.statusActive : styles.statusInactive}`}>
												{c.isActive ? "Active" : "Inactive"}
											</span>
										)}
									</TableCell>
									<TableCell>
										{c.certificateUrl ? (
											<a
												href={c.certificateUrl}
												target="_blank"
												rel="noopener noreferrer"
												className={styles.viewFileBtn}
											>
												<Eye size={14} />
												<span>View</span>
												<ExternalLink size={12} className={styles.externalIcon} />
											</a>
										) : (
											<span className={styles.noFile}>No File</span>
										)}
									</TableCell>
									<TableCell>
										{pendingApproval ? (
											<div className={styles.approvalActions}>
												<IconButton
													variant="success"
													title="Approve certificate"
													onClick={() => handleApproveClick(pendingApproval)}
												>
													<CheckCircle2 size={15} />
												</IconButton>
												<IconButton
													variant="danger"
													title="Reject certificate"
													onClick={() => handleRejectClick(pendingApproval._id)}
												>
													<XCircle size={15} />
												</IconButton>
											</div>
										) : (
											<IconButton variant="danger" onClick={() => handleDeleteClick(c._id)} title="Delete Certificate">
												<Trash2 size={15} />
											</IconButton>
										)}
									</TableCell>
								</TableContent>
							);
						})
					)}
				</Table>
			</div>

			{/* Mobile cards */}
			<div className={styles.mobileCards}>
				{isCaregiverLoading ? (
					<ErrorState isLoading={true} />
				) : caregiverFetchError ? (
					<ErrorState errorMessage={caregiverFetchError} />
				) : certifications.length === 0 ? (
					<p style={{ textAlign: "center", color: "#9ca3af", padding: "2rem 0" }}>No certifications found.</p>
				) : (
					certifications.map((c) => {
						const option = CERTIFICATE_OPTIONS.find((opt) => opt.value === c.name);
						const friendlyName = option ? option.label : c.name;
						const pendingApproval = certIdToApproval[c._id];

						return (
							<div key={c._id} className={styles.certCard}>
								<div className={styles.certCardHeader}>
									<span className={styles.certCardName}>{friendlyName}</span>
									{pendingApproval ? (
										<span className={styles.statusPill} style={{ background: "#fef3c7", color: "#92400e", border: "1px solid #fcd34d" }}>
											Pending Review
										</span>
									) : (
										<span className={`${styles.statusPill} ${c.isActive ? styles.statusActive : styles.statusInactive}`}>
											{c.isActive ? "Active" : "Inactive"}
										</span>
									)}
								</div>

								<div className={styles.certCardDates}>
									<div className={styles.certCardDateField}>
										<span className={styles.certCardDateLabel}>Issue Date</span>
										<span className={styles.certCardDateValue}>{formatDateOnly(c.startDate)}</span>
									</div>
									<div className={styles.certCardDateField}>
										<span className={styles.certCardDateLabel}>Expiry Date</span>
										<span className={styles.certCardDateValue}>{formatDateOnly(c.expiryDate)}</span>
									</div>
									{c.renewalDate && (
										<div className={styles.certCardDateField}>
											<span className={styles.certCardDateLabel}>Renewal Date</span>
											<span className={styles.certCardDateValue}>{formatDateOnly(c.renewalDate)}</span>
										</div>
									)}
								</div>

								<div className={styles.certCardFooter}>
									{c.certificateUrl ? (
										<a
											href={c.certificateUrl}
											target="_blank"
											rel="noopener noreferrer"
											className={styles.viewFileBtn}
										>
											<Eye size={14} />
											<span>View</span>
											<ExternalLink size={12} className={styles.externalIcon} />
										</a>
									) : (
										<span className={styles.noFile}>No File</span>
									)}

									{pendingApproval ? (
										<div className={styles.approvalActions}>
											<IconButton
												variant="success"
												title="Approve certificate"
												onClick={() => handleApproveClick(pendingApproval)}
											>
												<CheckCircle2 size={15} />
											</IconButton>
											<IconButton
												variant="danger"
												title="Reject certificate"
												onClick={() => handleRejectClick(pendingApproval._id)}
											>
												<XCircle size={15} />
											</IconButton>
										</div>
									) : (
										<IconButton variant="danger" onClick={() => handleDeleteClick(c._id)} title="Delete Certificate">
											<Trash2 size={15} />
										</IconButton>
									)}
								</div>
							</div>
						);
					})
				)}
			</div>

			{/* Upload modal */}
			<CertificateModal
				isOpen={isModalOpen}
				onClose={() => setIsModalOpen(false)}
				userId={userId}
				onSuccess={() => setActionMsg({ variant: "success", text: "Upload Successful!" })}
			/>

			{/* Delete confirmation modal */}
			<Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)}>
				<div className={styles.modal_content}>
					<h2>Are you sure you want to delete this certificate?</h2>
					<div className={styles.modal_buttons}>
						<Button variant="primary" onClick={confirmDelete} disabled={isDeleting}>
							{isDeleting ? "Deleting..." : "Yes"}
						</Button>
						<Button variant="secondary" onClick={() => setShowDeleteModal(false)}>No</Button>
					</div>
				</div>
			</Modal>

			{/* Approve confirmation modal */}
			<Modal isOpen={showApproveModal} onClose={closeApproveModal}>
				<div className={styles.modal_content}>
					<div className={styles.approveModalIcon}>
						<CheckCircle2 size={26} strokeWidth={1.5} />
					</div>
					<h2>Approve Certificate?</h2>
					<p className={styles.approveModalDesc}>
						Please verify and adjust the certificate dates if needed before approving.
					</p>

					{/* Inline date editing */}
					<div className={styles.approveDatesCheck}>
						<div className={styles.approveDatesCheckHeader}>
							<AlertTriangle size={13} />
							Certificate Dates
						</div>
						<div className={styles.approveDatesInputGrid}>
							<div className={styles.approveDateInputField}>
								<label className={styles.approveDateInputLabel}>Issue Date</label>
								<input
									type="date"
									className={styles.approveDateInput}
									value={approveModalDates.startDate}
									onChange={(e) => setApproveModalDates(d => ({ ...d, startDate: e.target.value }))}
								/>
							</div>
							<div className={styles.approveDateInputField}>
								<label className={styles.approveDateInputLabel}>Expiry Date</label>
								<input
									type="date"
									className={styles.approveDateInput}
									value={approveModalDates.expiryDate}
									onChange={(e) => setApproveModalDates(d => ({ ...d, expiryDate: e.target.value }))}
								/>
							</div>
							<div className={`${styles.approveDateInputField} ${styles.approveDateInputFullWidth}`}>
								<label className={styles.approveDateInputLabel}>
									Renewal Date <span className={styles.approveDateInputOptional}>(optional)</span>
								</label>
								<input
									type="date"
									className={styles.approveDateInput}
									value={approveModalDates.renewalDate}
									onChange={(e) => setApproveModalDates(d => ({ ...d, renewalDate: e.target.value }))}
								/>
							</div>
						</div>
					</div>

					{approveError && <ActionMessage variant="error" message={approveError} />}
					<div className={styles.approveReasonField}>
						<label className={styles.approveReasonLabel}>Note (optional)</label>
						<textarea
							className={styles.approveReasonTextarea}
							rows={2}
							placeholder="Add an optional note…"
							value={approveReason}
							onChange={(e) => setApproveReason(e.target.value)}
						/>
					</div>
					<div className={styles.modal_buttons}>
						<Button
							variant="primary"
							icon={isApprovePending ? <Loader size={14} className={styles.spinnerIcon} /> : <CheckCircle2 size={14} />}
							disabled={isApprovePending}
							onClick={confirmApprove}
						>
							{isApprovePending ? "Approving…" : "Confirm"}
						</Button>
						<Button variant="secondary" onClick={closeApproveModal} disabled={isApprovePending}>
							Cancel
						</Button>
					</div>
				</div>
			</Modal>

			{/* Reject modal */}
			<Modal isOpen={showRejectModal} onClose={() => setShowRejectModal(false)}>
				<div className={styles.modal_content}>
					<div className={styles.rejectModalIcon}>
						<XCircle size={26} strokeWidth={1.5} />
					</div>
					<h2>Reject Certificate?</h2>
					<p className={styles.approveModalDesc}>
						Rejecting this request will permanently delete this certificate.
					</p>
					{rejectError && <ActionMessage variant="error" message={rejectError} />}
					<div className={styles.approveReasonField} style={{ textAlign: "left" }}>
						<label className={styles.approveReasonLabel}>
							Reason <span style={{ color: "#dc2626" }}>*</span>
						</label>
						<textarea
							className={`${styles.approveReasonTextarea} ${rejectReasonErr ? styles.rejectTextareaError : ""}`}
							rows={3}
							placeholder="Explain why this certificate is being rejected…"
							value={rejectReason}
							onChange={(e) => { setRejectReason(e.target.value); if (e.target.value.trim()) setRejectReasonErr(""); }}
						/>
						{rejectReasonErr && <span className={styles.rejectErrorMsg}>{rejectReasonErr}</span>}
					</div>
					<div className={styles.modal_buttons}>
						<Button
							variant="danger"
							icon={isRejectPending ? <Loader size={14} className={styles.spinnerIcon} /> : <XCircle size={14} />}
							disabled={isRejectPending}
							onClick={confirmReject}
						>
							{isRejectPending ? "Rejecting…" : "Confirm Reject"}
						</Button>
						<Button variant="secondary" onClick={() => setShowRejectModal(false)} disabled={isRejectPending}>
							Cancel
						</Button>
					</div>
				</div>
			</Modal>
		</div>
	);
}
