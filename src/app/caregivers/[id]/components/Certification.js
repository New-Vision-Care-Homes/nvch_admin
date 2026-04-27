"use client";

import React, { useState, useEffect } from "react";
import styles from "./Certification.module.css";
import { Trash2, Upload, Eye, ExternalLink } from "lucide-react";
import Button from "@components/UI/Button";
import Modal from "@components/UI/Modal";
import { Table, TableHeader, TableContent, TableCell } from "@components/UI/Table";
import ActionMessage from "@components/UI/ActionMessage";
import ErrorState from "@components/UI/ErrorState";
import { useParams } from "next/navigation";
import { useCaregivers } from "@/hooks/useCaregivers";
import { useCertificates } from "@/hooks/useCertificates";

import CertificateModal from "@components/UI/CertificateModal";

export default function Certification() {

	// --- 1. Hooks---
	const { id: userId } = useParams();
	const { caregiverDetail, isCaregiverLoading, caregiverFetchError } = useCaregivers(userId);
	const { deleteCertificate: deleteCert, isCertificateDeleting: isDeleting } = useCertificates(userId);

	// --- 2. State management ---
	const [isModalOpen, setIsModalOpen] = useState(false); // For Add New
	const [showDeleteModal, setShowDeleteModal] = useState(false); // For Delete Confirmation
	const [targetCertId, setTargetCertId] = useState(null);
	const [actionMsg, setActionMsg] = useState(null);

	const certifications = caregiverDetail?.certifications || [];

	// --- 3. Handlers ---
	const handleDeleteClick = (certId) => {
		setTargetCertId(certId);
		setShowDeleteModal(true);
	};

	const confirmDelete = () => {
		if (!targetCertId) return;

		// Call the mutation defined at the top
		deleteCert(targetCertId, {
			onSuccess: () => {
				setShowDeleteModal(false);
				setTargetCertId(null);
				setActionMsg({ variant: "success", text: "Certificate deleted successfully." });
			},
			onError: (err) => setActionMsg({ variant: "danger", text: `Delete failed: ${err.message}` })
		});
	};


	function handleNewCertification() {
		setIsModalOpen(true);
	}

	return (
		<div className={styles.container}>
			<div className={styles.title}>
				<h2>Certifications</h2>
				<Button onClick={handleNewCertification}>
					<Upload size={16} style={{ marginRight: 8 }} />
					Upload New Certificate
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
						<TableCell colSpan={6} style={{ padding: '0' }}>
							<ErrorState isLoading={true} />
						</TableCell>
					</TableContent>
				) : caregiverFetchError ? (
					<TableContent>
						<TableCell colSpan={6} style={{ padding: '0' }}>
							<ErrorState errorMessage={caregiverFetchError} />
						</TableCell>
					</TableContent>
				) : certifications.length === 0 ? (
					<TableContent>
						<TableCell colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>
							No certifications found.
						</TableCell>
					</TableContent>
				) : (
					certifications.map(c => (
						<TableContent key={c._id}>
							<TableCell>{c.name}</TableCell>
							<TableCell>{c.startDate ? new Date(c.startDate).toLocaleDateString() : "-"}</TableCell>
							<TableCell>{c.expiryDate ? new Date(c.expiryDate).toLocaleDateString() : "-"}</TableCell>
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
							<TableCell>{c.isActive ? "Active" : "Inactive"}</TableCell>
							<TableCell>
								<Trash2
									color="#ef4444"
									style={{ width: '1.5rem', height: '1.5rem', cursor: 'pointer', marginLeft: '0.5rem' }}
									onClick={() => handleDeleteClick(c._id)}
								/>
							</TableCell>
						</TableContent>
					))
				)}
			</Table>


			{/* Modal */}
			<CertificateModal
				isOpen={isModalOpen}
				onClose={() => setIsModalOpen(false)}
				userId={userId}
				onSuccess={() => setActionMsg({ variant: "success", text: "Upload Successful!" })}
			/>

			{/* Delete Confirmation Modal */}
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
		</div>
	);
}

