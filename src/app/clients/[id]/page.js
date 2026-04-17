"use client";

import React, { useState, useEffect, useCallback } from "react";
import PageLayout from "@components/layout/PageLayout";
import Tabs from "./components/Tabs";
import Button from "@components/UI/Button";
import { Card, CardHeader, InfoField } from "@components/UI/Card";
import styles from "./client_profile.module.css";
import Image from "next/image";
import Link from "next/link";
import { Edit, Activity, Undo2, Upload } from "lucide-react";
import Modal from "@components/UI/Modal";
import { useParams } from "next/navigation";

import { useProfileUpload } from "@/hooks/usePictures";
import { useClients } from "@/hooks/useClients";


// --- Constants for File Validation ---
const SUPPORTED_FORMATS = ["image/jpg", "image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 500 * 1024; // 500KB limit
import defaultAvatar from "@/assets/img/navbar/avatar.jpg";

export default function Page() {
	const { id } = useParams();

	const {
		clientDetail,
		isLoading,
		isError,
		errorMessage,
		isActionPending,
		toggleClientStatus
	} = useClients(id);

	console.log("client: ", clientDetail);

	// --- Image Upload States ---
	const [isImageModalOpen, setIsImageModalOpen] = useState(false);
	const [selectedFile, setSelectedFile] = useState(null);
	const [previewUrl, setPreviewUrl] = useState(null);
	const [uploading, setUploading] = useState(false);
	const [uploadError, setUploadError] = useState("");

	// --- General UI States ---
	const [isGeneralModalOpen, setIsGeneralModalOpen] = useState(false);
	const [isStatusConfirmModalOpen, setIsStatusConfirmModalOpen] = useState(false);
	const [inlineMessage, setInlineMessage] = useState(null);
	const [message, setMessage] = useState("");


	const { uploadProfilePicture, isUploading, uploadErrorMessage } = useProfileUpload();


	/**
	 * @function handleImageUpload
	 * @description The 3-step process to update profile picture:
	 * 1. Get a Pre-signed upload URL from backend.
	 * 2. Upload the binary file directly to S3.
	 * 3. Inform the backend to update the user's profilePicture field with the new fileKey.
	 */
	const handleImageUpload = async () => {
		if (!selectedFile) return;
		setUploading(true);
		setUploadError("");

		uploadProfilePicture(
			{ file: selectedFile, userId: id },
			{
				onSuccess: () => {
					setMessage("Profile picture updated successfully!");
					setIsGeneralModalOpen(true);
					handleCloseImageModal();
				},
				onError: (err) => {
					setUploadError(err?.message || "Failed to upload image.");
				},
				onSettled: () => {
					setUploading(false);
				}
			}
		);
	};

	const handleActive = () => {
		setIsStatusConfirmModalOpen(true);
	};

	const confirmToggleStatus = () => {
		if (!clientDetail) return;
		toggleClientStatus(id, {
			onSuccess: (data) => {
				const newActiveStatus = data?.data?.isActive ?? !clientDetail.isActive;
				setIsStatusConfirmModalOpen(false);
				setInlineMessage({ type: 'success', text: data?.message || `The client has been ${newActiveStatus ? "activated" : "deactivated"} successfully.` });
				setTimeout(() => setInlineMessage(null), 5000);
			},
			onError: (err) => {
				setIsStatusConfirmModalOpen(false);
				setInlineMessage({ type: 'error', text: `Failed to update client status: ${err.message || "Unexpected error"}` });
				setTimeout(() => setInlineMessage(null), 5000);
			}
		});
	};

	const handleStatusConfirmCancel = () => {
		setIsStatusConfirmModalOpen(false);
	};

	// --- File Input Change Handler ---
	const handleFileChange = (e) => {
		const file = e.target.files[0];
		if (file) {
			if (file.size > MAX_FILE_SIZE) {
				setUploadError("File is too large (max 500KB).");
				return;
			}
			if (!SUPPORTED_FORMATS.includes(file.type)) {
				setUploadError("Unsupported format. Use JPG, PNG or WEBP.");
				return;
			}
			setSelectedFile(file);
			setPreviewUrl(URL.createObjectURL(file)); // Generate local preview URL
		}
	};

	const handleCloseImageModal = () => {
		setIsImageModalOpen(false);
		setSelectedFile(null);
		setUploadError("");
		setUploading(false);
		if (previewUrl) URL.revokeObjectURL(previewUrl); // Free browser memory
		setPreviewUrl(null);
	};

	if (isLoading) {
		return (
			<PageLayout>
				<div>Loading client info...</div>
			</PageLayout>
		);
	}

	if (isError) {
		return (
			<PageLayout>
				<div style={{ color: 'red' }}>Error: {errorMessage}</div>
			</PageLayout>
		);
	}

	if (!clientDetail) {
		return (
			<PageLayout>
				<div>Client not found.</div>
			</PageLayout>
		);
	}


	return (
		<>
			<PageLayout>
				{inlineMessage && (
					<div style={{
						backgroundColor: inlineMessage.type === 'error' ? '#fee2e2' : '#dcfce7',
						color: inlineMessage.type === 'error' ? '#991b1b' : '#166534',
						padding: '1rem',
						borderRadius: '6px',
						marginBottom: '1rem',
						fontWeight: '500',
						textAlign: 'center',
						border: `1px solid ${inlineMessage.type === 'error' ? '#fecaca' : '#bbf7d0'}`
					}}>
						{inlineMessage.text}
					</div>
				)}
				<div className={styles.header}>
					<h1>Client Profile: {clientDetail.firstName} {clientDetail.lastName}</h1>
					<div className={styles.headerActions}>
						<Button
							variant={clientDetail.isActive ? "dangerLight" : "successLight"}
							icon={<Activity size={16} />}
							onClick={handleActive}
							disabled={isActionPending}
						>
							{clientDetail.isActive ? "Inactive" : "Active"}
						</Button>
						<Link href="/clients">
							<Button variant="secondary" icon={<Undo2 size={16} />}>Back</Button>
						</Link>
					</div>
				</div>

				<Card>
					<CardHeader>Client Overview</CardHeader>
					<div className={styles.content}>
						<div className={styles.text}>
							<div className={styles.column}>
								<InfoField label="Client ID">{clientDetail.clientId}</InfoField>
								<InfoField label="Status">
									<span className={`${styles.statusPill} ${clientDetail.isActive ? styles.statusActive : styles.statusInactive}`}>
										{clientDetail.isActive ? "Active" : "Inactive"}
									</span>
								</InfoField>
							</div>
							<div className={styles.column}>
								<InfoField label="Care Plan Status">On Track</InfoField>
								<InfoField label="Last Visit">2024-07-28</InfoField>
							</div>
						</div>
						<div className={styles.picture}>
							<Image
								src={clientDetail.profilePictureUrl || defaultAvatar}
								alt="Profile"
								width={100}
								height={100}
								className={styles.image}
								unoptimized
							/>
							<Button
								variant="secondary"
								size="sm"
								icon={<Upload size={16} />}
								onClick={() => setIsImageModalOpen(true)}
							>
								Upload
							</Button>
						</div>
					</div>
				</Card>

				<div className={styles.tabs}>
					<Tabs />
				</div>
			</PageLayout>

			{/* Status Confirmation Modal */}
			<Modal isOpen={isStatusConfirmModalOpen} onClose={handleStatusConfirmCancel}>
				<div style={{ padding: '2rem 1rem', textAlign: 'center' }}>
					<h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem', color: '#1f2937' }}>
						Are you sure you want to {clientDetail.isActive ? "deactivate" : "activate"} this client?
					</h2>
					<div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
						<Button variant="secondary" onClick={handleStatusConfirmCancel} disabled={isActionPending}>
							No, Cancel
						</Button>
						<Button variant="primary" onClick={confirmToggleStatus} disabled={isActionPending}>
							Yes, {clientDetail.isActive ? "Deactivate" : "Activate"}
						</Button>
					</div>
				</div>
			</Modal>

			{/* General Feedback Modal */}
			<Modal isOpen={isGeneralModalOpen} onClose={() => setIsGeneralModalOpen(false)}>
				<h2>{message}</h2>
				<div className={styles.modalActions} style={{ justifyContent: 'center', marginTop: '15px' }}>
					<Button variant="primary" onClick={() => setIsGeneralModalOpen(false)}>Close</Button>
				</div>
			</Modal>

			{/* Image Upload Popup */}
			<Modal isOpen={isImageModalOpen} onClose={handleCloseImageModal}>
				<div className={styles.centeredModalContainer}>
					<h2>Update Profile Picture</h2>
					<div className={styles.uploadModalContent}>
						<div className={styles.imagePreview}>
							<Image
								// Show preview of selected file if available, otherwise current image
								src={previewUrl || clientDetail.profilePictureUrl || defaultAvatar}
								alt="Preview"
								width={150}
								height={150}
								className={styles.image}
								unoptimized
							/>
						</div>

						<label className={styles.fileInputLabelCustom}>
							Select File
							<input
								type="file"
								accept={SUPPORTED_FORMATS.join(',')}
								onChange={handleFileChange}
								className={styles.hiddenFileInput}
								disabled={uploading}
							/>
						</label>

						{selectedFile && <p className={styles.fileName}>Selected: {selectedFile.name}</p>}
						{uploadError && <p className={styles.errorMessage}>{uploadError}</p>}

						<div className={styles.modalActions}>
							<Button variant="secondary" onClick={handleCloseImageModal} disabled={uploading}>
								Cancel
							</Button>
							<Button
								variant="primary"
								onClick={handleImageUpload}
								disabled={!selectedFile || uploading || !!uploadError}
							>
								{uploading ? "Saving..." : "Save Picture"}
							</Button>
						</div>
					</div>
				</div>
			</Modal>
		</>
	);
}

