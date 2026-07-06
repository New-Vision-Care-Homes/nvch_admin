"use client";

import React, { useState } from "react";
import styles from "./Certification.module.css";
import { Trash2, Upload, Eye, ExternalLink, CheckCircle2, XCircle, Loader } from "lucide-react";
import Button from "@components/UI/Button";
import IconButton from "@components/UI/IconButton";
import Modal from "@components/UI/Modal";
import { Table, TableHeader, TableContent, TableCell } from "@components/UI/Table";
import ActionMessage from "@components/UI/ActionMessage";
import ErrorState from "@components/UI/ErrorState";
import { useParams } from "next/navigation";
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
	const [isModalOpen,      setIsModalOpen]      = useState(false);
	const [showDeleteModal,  setShowDeleteModal]   = useState(false);
	const [targetCertId,     setTargetCertId]      = useState(null);

	const [showApproveModal, setShowApproveModal]  = useState(false);
	const [approveReason,    setApproveReason]     = useState("");
	const [targetApprovalId, setTargetApprovalId]  = useState(null);

	const [showRejectModal,  setShowRejectModal]   = useState(false);
	const [rejectReason,     setRejectReason]      = useState("");
	const [rejectReasonErr,  setRejectReasonErr]   = useState("");

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
	const handleApproveClick = (approvalId) => {
		setTargetApprovalId(approvalId);
		setApproveReason("");
		setShowApproveModal(true);
	};

	const confirmApprove = async () => {
		try {
			await approve({ id: targetApprovalId, reason: approveReason.trim() || undefined });
			await refetchCaregiver();
			setShowApproveModal(false);
			setTargetApprovalId(null);
			setApproveReason("");
			setActionMsg({ variant: "success", text: "Certificate approved successfully." });
		} catch (_) {}
	};

	// ── Reject handlers ────────────────────────────────────────────────────────
	const handleRejectClick = (approvalId) => {
		setTargetApprovalId(approvalId);
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
			await reject({ id: targetApprovalId, reason: rejectReason.trim() });
			await refetchCaregiver();
			setShowRejectModal(false);
			setTargetApprovalId(null);
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

			<Table>
				<TableHeader>
					<TableCell>Name</TableCell>
					<TableCell>Issue Date</TableCell>
					<TableCell>Expiry Date</TableCell>
					<TableCell>Status</TableCell>
					<TableCell>Document</TableCell>
					<TableCell>Action</TableCell>
				</TableHeader>

				{isCaregiverLoading ? (
					<TableContent>
						<TableCell colSpan={6} style={{ padding: "0" }}>
							<ErrorState isLoading={true} />
						</TableCell>
					</TableContent>
				) : caregiverFetchError ? (
					<TableContent>
						<TableCell colSpan={6} style={{ padding: "0" }}>
							<ErrorState errorMessage={caregiverFetchError} />
						</TableCell>
					</TableContent>
				) : certifications.length === 0 ? (
					<TableContent>
						<TableCell colSpan={6} style={{ textAlign: "center", padding: "2rem" }}>
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
								<TableCell>{c.startDate ? new Date(c.startDate).toLocaleDateString() : "—"}</TableCell>
								<TableCell>{c.expiryDate ? new Date(c.expiryDate).toLocaleDateString() : "—"}</TableCell>
								<TableCell>
									{c.certificateUrl ? (
										<a
											href={c.certificateUrl}
											target="_blank"
											rel="noopener noreferrer"
											className={styles.viewFileBtn}
										>
											<Eye size={14} />
											<span>View Document</span>
											<ExternalLink size={12} className={styles.externalIcon} />
										</a>
									) : (
										<span className={styles.noFile}>No File</span>
									)}
								</TableCell>
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
									{pendingApproval ? (
										<div className={styles.approvalActions}>
											<IconButton
												variant="success"
												title="Approve certificate"
												onClick={() => handleApproveClick(pendingApproval._id)}
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
			<Modal isOpen={showApproveModal} onClose={() => { setShowApproveModal(false); setApproveReason(""); }}>
				<div className={styles.modal_content}>
					<div className={styles.approveModalIcon}>
						<CheckCircle2 size={26} strokeWidth={1.5} />
					</div>
					<h2>Approve Certificate?</h2>
					<p className={styles.approveModalDesc}>
						This certificate will be marked as active.
					</p>
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
						<Button variant="secondary" onClick={() => { setShowApproveModal(false); setApproveReason(""); }} disabled={isApprovePending}>
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
						This certificate will remain inactive.
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
