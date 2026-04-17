"use client";

import React, { useState, useEffect } from "react";
import styles from "./Certification.module.css";
import { Trash2, Paperclip, Upload, X, Eye, ExternalLink, FileText } from "lucide-react";
import Button from "@components/UI/Button";
import Modal from "@components/UI/Modal";
import { Table, TableHeader, TableContent, TableCell } from "@components/UI/Table";
import { InputField } from "@components/UI/Card";
import ActionMessage from "@components/UI/ActionMessage";
import ErrorState from "@components/UI/ErrorState";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { dateRule, longTextRule, shortTextRule } from "@/utils/validation";
import { useParams } from "next/navigation";
import { useCaregivers } from "@/hooks/useCaregivers";
import { useUploadCertificate, useDeleteCertificate } from "@/hooks/useCertificates";

const schema = yup.object({
	name: longTextRule.required("Certificate name is required"),
	issueDate: dateRule.required("Issue date is required"),
	expiryDate: dateRule
		.required("Expiry date is required")
		.test(
			"is-after-issue",
			"Expiry date must be after issue date",
			function (value) {
				const { issueDate } = this.parent;
				if (!issueDate || !value) return true;
				return new Date(value) > new Date(issueDate);
			}
		),
	file: yup.mixed().test("required", "Please upload a document", (value) => {
		return value && value.length > 0;
	})
});

export default function Certification() {

	// --- 1. Hooks---
	const { id: userId } = useParams();
	const { caregiverDetail, isCaregiverLoading, caregiverFetchError } = useCaregivers(userId);
	const { mutate: upload, isPending: isUploading } = useUploadCertificate(userId);
	const { mutate: deleteCert, isPending: isDeleting } = useDeleteCertificate(userId);

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


	const { register, handleSubmit, watch, setValue, control, formState: { errors }, reset } = useForm({
		resolver: yupResolver(schema),
	});


	const selectedFile = watch("file");

	function handleNewCertification() {
		reset();
		setIsModalOpen(true);
	}

	const handleSave = async (formData) => {
		upload(formData, {
			onSuccess: () => {
				setIsModalOpen(false);
				reset();
				setActionMsg({ variant: "success", text: "Upload Successful!" });
			},
			onError: (error) => setActionMsg({ variant: "danger", text: `Upload Failed: ${error.message}` })
		});
	};

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
			<Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); reset(); }}>
				<h2 style={{ marginBottom: '20px' }}>Add New Certificate</h2>

				<form onSubmit={handleSubmit(handleSave)}>
					<InputField label="Certificate Name" name="name" register={register} error={errors.name} />

					<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
						<InputField label="Issue Date" type="date" name="issueDate" register={register} control={control} error={errors.issueDate} />
						<InputField label="Expiry Date" type="date" name="expiryDate" register={register} control={control} error={errors.expiryDate} />
					</div>

					<div className={styles.uploadField}>
						<label className={styles.label}>Certificate Document</label>
						<div className={`${styles.dropzone} ${errors.file ? styles.errorBorder : ""}`}>
							<input
								type="file"
								id="certFile"
								{...register("file")}
								className={styles.hiddenInput}
							/>
							<label htmlFor="certFile" className={styles.uploadTrigger}>
								<Paperclip size={18} />
								<span>{selectedFile?.[0] ? selectedFile[0].name : "Click to select a file (PDF, JPG...)"}</span>
								{selectedFile?.[0] && (
									<X size={16} className={styles.clearFile} onClick={(e) => {
										e.preventDefault();
										setValue("file", null);
									}} />
								)}
							</label>
						</div>
						{errors.file && <p className={styles.errorMessage}>{errors.file.message}</p>}
					</div>

					<div style={{ display: "flex", justifyContent: "flex-end", marginTop: 24, gap: 12 }}>
						<Button variant="secondary" type="button" onClick={() => { setIsModalOpen(false); reset(); }}>Cancel</Button>
						<Button type="submit" disabled={isUploading}>
							{isUploading ? "Saving..." : "Save Certificate"}
						</Button>
					</div>
				</form>
			</Modal>

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

