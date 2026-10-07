"use client";

import React, { useState } from "react";
import styles from "./Documents.module.css";
import { Trash2, Upload, Eye, ExternalLink, FileX } from "lucide-react";
import Button from "@components/UI/Button/Button";
import IconButton from "@components/UI/Button/IconButton";
import Modal from "@components/UI/Modal/Modal";
import { Table, TableHeader, TableContent, TableCell } from "@components/UI/Table/Table";
import ActionMessage from "@components/UI/Feedback/ActionMessage";
import ErrorState from "@components/UI/Feedback/ErrorState";
import EmptyState from "@components/UI/Feedback/EmptyState";
import { useParams } from "next/navigation";
import { formatDateTime } from "@/utils/dates";
import { personName } from "@/utils/formatting";
import { useClientDocuments } from "@/hooks/useClientDocuments";
import { CLIENT_DOCUMENT_OPTIONS, getClientDocumentColor } from "@/utils/dropdownList/clientDocument";
import { ColorPill } from "@components/UI/Feedback/Badge";
import ClientDocumentModal from "./ClientDocumentModal";

export default function Documents() {
	const { id: clientId } = useParams();

	const {
		documents,
		isDocumentsLoading,
		documentsFetchError,
		deleteDocument,
		isDocumentDeleting,
	} = useClientDocuments(clientId);

	const [isModalOpen, setIsModalOpen] = useState(false);
	const [showDeleteModal, setShowDeleteModal] = useState(false);
	const [targetDocId, setTargetDocId] = useState(null);
	const [actionMsg, setActionMsg] = useState(null);

	const handleDeleteClick = (docId) => {
		setTargetDocId(docId);
		setShowDeleteModal(true);
	};

	const confirmDelete = () => {
		if (!targetDocId) return;
		deleteDocument(targetDocId, {
			onSuccess: () => {
				setShowDeleteModal(false);
				setTargetDocId(null);
				setActionMsg({ variant: "success", text: "Document deleted successfully." });
			},
			onError: (err) => setActionMsg({ variant: "danger", text: `Delete failed: ${err.message}` }),
		});
	};

	return (
		<div className={styles.container}>
			<div className={styles.toolbar}>
				<Button onClick={() => setIsModalOpen(true)} icon={<Upload size={14} />}>
					Upload Document
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
						<TableCell className={styles.typeCol}>Type</TableCell>
						<TableCell>Uploaded At</TableCell>
						<TableCell>Uploaded By</TableCell>
						<TableCell>Document</TableCell>
						<TableCell>Action</TableCell>
					</TableHeader>

					{isDocumentsLoading ? (
						<TableContent className={styles.stateRow}>
							<TableCell colSpan={5} className={styles.stateCell}>
								<ErrorState isLoading={true} />
							</TableCell>
						</TableContent>
					) : documentsFetchError ? (
						<TableContent className={styles.stateRow}>
							<TableCell colSpan={5} className={styles.stateCell}>
								<ErrorState errorMessage={documentsFetchError} />
							</TableCell>
						</TableContent>
					) : documents.length === 0 ? (
						<TableContent className={styles.stateRow}>
							<TableCell colSpan={5} className={styles.stateCell}>
								<EmptyState title="No documents found" message="Upload a document to get started." />
							</TableCell>
						</TableContent>
					) : (
						documents.map((d) => {
							const option = CLIENT_DOCUMENT_OPTIONS.find((opt) => opt.value === d.type);
							const friendlyName = option ? option.label : d.type;

							return (
								<TableContent key={d.id}>
									<TableCell className={styles.typeCol}>
										<span className={styles.pillWrap}>
											<ColorPill label={friendlyName} color={getClientDocumentColor(d.type)} />
										</span>
									</TableCell>
									<TableCell>{formatDateTime(d.uploadedAt)}</TableCell>
									<TableCell>{personName(d.uploadedByInfo)}</TableCell>
									<TableCell>
										{d.fileUrl ? (
											<a
												href={d.fileUrl}
												target="_blank"
												rel="noopener noreferrer"
												className={styles.viewFileBtn}
											>
												<Eye size={14} />
												<span>View</span>
												<ExternalLink size={12} className={styles.externalIcon} />
											</a>
										) : (
											<span className={styles.noFile}>
												<FileX size={13} />
												No File
											</span>
										)}
									</TableCell>
									<TableCell>
										<IconButton variant="danger" onClick={() => handleDeleteClick(d.id)} title="Delete Document">
											<Trash2 size={15} />
										</IconButton>
									</TableCell>
								</TableContent>
							);
						})
					)}
				</Table>
			</div>

			{/* Mobile cards */}
			<div className={styles.mobileCards}>
				{isDocumentsLoading ? (
					<ErrorState isLoading={true} />
				) : documentsFetchError ? (
					<ErrorState errorMessage={documentsFetchError} />
				) : documents.length === 0 ? (
					<EmptyState title="No documents found" message="Upload a document to get started." />
				) : (
					documents.map((d) => {
						const option = CLIENT_DOCUMENT_OPTIONS.find((opt) => opt.value === d.type);
						const friendlyName = option ? option.label : d.type;

						return (
							<div key={d.id} className={styles.docCard}>
								<div className={styles.docCardHeader}>
									<span className={styles.pillWrap}>
										<ColorPill label={friendlyName} color={getClientDocumentColor(d.type)} />
									</span>
									<span className={styles.docCardDate}>{formatDateTime(d.uploadedAt)}</span>
								</div>

								<div className={styles.docCardMeta}>
									Uploaded by {personName(d.uploadedByInfo)}
								</div>

								<div className={styles.docCardFooter}>
									{d.fileUrl ? (
										<a
											href={d.fileUrl}
											target="_blank"
											rel="noopener noreferrer"
											className={styles.viewFileBtn}
										>
											<Eye size={14} />
											<span>View</span>
											<ExternalLink size={12} className={styles.externalIcon} />
										</a>
									) : (
										<span className={styles.noFile}>
											<FileX size={13} />
											No File
										</span>
									)}

									<IconButton variant="danger" onClick={() => handleDeleteClick(d.id)} title="Delete Document">
										<Trash2 size={15} />
									</IconButton>
								</div>
							</div>
						);
					})
				)}
			</div>

			{/* Upload modal */}
			<ClientDocumentModal
				isOpen={isModalOpen}
				onClose={() => setIsModalOpen(false)}
				clientId={clientId}
				onSuccess={() => setActionMsg({ variant: "success", text: "Upload Successful!" })}
			/>

			{/* Delete confirmation modal */}
			<Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)}>
				<div className={styles.modal_content}>
					<h2>Are you sure you want to delete this document?</h2>
					<div className={styles.modal_buttons}>
						<Button variant="primary" onClick={confirmDelete} disabled={isDocumentDeleting}>
							{isDocumentDeleting ? "Deleting..." : "Yes"}
						</Button>
						<Button variant="secondary" onClick={() => setShowDeleteModal(false)}>No</Button>
					</div>
				</div>
			</Modal>
		</div>
	);
}
