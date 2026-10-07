import React, { useEffect } from "react";
import Modal from "@components/UI/Modal/Modal";
import Button from "@components/UI/Button/Button";
import { InputField } from "@components/UI/Form/Card";
import styles from "@components/UI/Modal/UploadModal.module.css";
import { Paperclip, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { longTextRule } from "@/utils/validation";
import { useClientDocuments } from "@/hooks/useClientDocuments";
import { CLIENT_DOCUMENT_OPTIONS } from "@/utils/dropdownList/clientDocument";

const schema = yup.object({
	type: longTextRule.required("Document type is required"),
	file: yup.mixed()
		.test("required", "Please upload a document", (value) => {
			return value && value.length > 0;
		})
		.test("fileSize", "File size is too large (max 5MB)", (value) => {
			if (!value || value.length === 0) return true;
			return value[0].size <= 5 * 1024 * 1024; // 5MB limit
		})
		.test("fileType", "Unsupported file type. Use PDF, JPG, or PNG.", (value) => {
			if (!value || value.length === 0) return true;
			const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
			return allowedTypes.includes(value[0].type);
		})
});

/**
 * Reusable Client Document Upload Modal Component.
 * @param {boolean} isOpen - Determines if the modal should be visible.
 * @param {function} onClose - Function to call when the modal is closed (e.g., when clicking "Cancel").
 * @param {string} clientId - The ID of the client this document belongs to.
 * @param {function} onSuccess - Optional callback executed after a successful upload.
 */
export default function ClientDocumentModal({ isOpen, onClose, clientId, onSuccess }) {
	const { uploadDocument, isDocumentUploading, isDocumentError, documentErrorMessage } = useClientDocuments(clientId);

	const { register, handleSubmit, watch, setValue, control, formState: { errors }, reset } = useForm({
		resolver: yupResolver(schema),
	});

	const selectedFile = watch("file");

	useEffect(() => {
		if (!isOpen) {
			reset();
		}
	}, [isOpen, reset]);

	const handleSave = async (formData) => {
		uploadDocument(formData, {
			onSuccess: () => {
				if (onSuccess) onSuccess();
				onClose();
				reset();
			}
		});
	};

	return (
		<Modal isOpen={isOpen} onClose={() => { onClose(); reset(); }}>
			<h2 style={{ marginBottom: '20px' }}>Add New Document</h2>

			<form onSubmit={handleSubmit(handleSave)}>
				<InputField label="Document Type" type="select" name="type" register={register} error={errors.type} options={CLIENT_DOCUMENT_OPTIONS} />

				<div className={styles.uploadField}>
					<label className={styles.label}>Document File</label>
					<div className={`${styles.dropzone} ${errors.file ? styles.errorBorder : ""}`}>
						<input
							type="file"
							id="clientDocFile"
							{...register("file")}
							className={styles.hiddenInput}
						/>
						<label htmlFor="clientDocFile" className={styles.uploadTrigger}>
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

					<p className={styles.fileNote} style={{ marginTop: '0.5rem', textAlign: 'center' }}>
						Max 5MB. Supported formats: PDF, JPG, PNG.
					</p>
				</div>

				{isDocumentError && <p className={styles.errorMessage}>{documentErrorMessage}</p>}

				<div style={{ display: "flex", justifyContent: "flex-end", marginTop: 24, gap: 12 }}>
					<Button variant="secondary" type="button" onClick={() => { onClose(); reset(); }}>Cancel</Button>
					<Button type="submit" disabled={isDocumentUploading}>
						{isDocumentUploading ? "Saving..." : "Save Document"}
					</Button>
				</div>
			</form>
		</Modal>
	);
}
