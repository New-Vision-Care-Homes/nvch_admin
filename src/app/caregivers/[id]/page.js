"use client";

import React, { useState } from "react";
// Assuming component paths are correct
import PageLayout from "@components/layout/PageLayout";
import Tabs from "./components/Tabs";
import Button from "@components/UI/Button";
import { Card, CardHeader, InfoField } from "@components/UI/Card";
import styles from "./caregiver_profile.module.css";
import Image from "next/image";
import defaultAvatar from "@/assets/img/navbar/avatar.jpg";
import Link from "next/link";
import { Activity, Undo2, Upload } from "lucide-react";
import Modal from "@components/UI/Modal";
import { useParams } from "next/navigation";

import { useProfileUpload } from "@/hooks/usePictures";
import { useCaregivers } from "@/hooks/useCaregivers";

// --- File Upload Constants ---
const SUPPORTED_FORMATS = ["image/jpg", "image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 500 * 1024; // 500KB limit

export default function Page() {
	const { id } = useParams(); // The userId (MongoDB ObjectId) for the caregiver

	const {
		caregiverDetail,
		isLoading,
		isError,
		errorMessage,
		isActionPending,
		updateCaregiver
	} = useCaregivers(id);

	// --- Image Upload States ---
	const [isImageModalOpen, setIsImageModalOpen] = useState(false);
	const [selectedFile, setSelectedFile] = useState(null);
	const [previewUrl, setPreviewUrl] = useState(null);
	const [uploading, setUploading] = useState(false);
	const [uploadError, setUploadError] = useState("");

	// --- General UI States ---
	const [isGeneralModalOpen, setIsGeneralModalOpen] = useState(false);
	const [message, setMessage] = useState("");

	const { uploadProfilePicture, isUploading } = useProfileUpload();

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
				onError: () => {
					setUploadError("Image upload failed. Please try again.");
				},
				onSettled: () => {
					setUploading(false);
				}
			}
		);
	};

	const handleActive = () => {
		if (!caregiverDetail) return;
		const newActiveStatus = !caregiverDetail.isActive;

		updateCaregiver(
			{ id, data: { employeeId: id, isActive: newActiveStatus } },
			{
				onSuccess: () => {
					setMessage(`Caregiver status updated to ${newActiveStatus ? "Active" : "Inactive"}`);
					setIsGeneralModalOpen(true);
				},
				onError: () => {
					setMessage("Status update failed.");
					setIsGeneralModalOpen(true);
				}
			}
		);
	};

	// --- Image Modal UI Handlers ---
	const handleFileChange = (e) => {
		if (previewUrl) URL.revokeObjectURL(previewUrl);
		setUploadError("");
		const file = e.target.files[0];

		if (file) {
			if (file.size > MAX_FILE_SIZE) {
				setUploadError(`File is too large (max ${MAX_FILE_SIZE / 1024}KB).`);
				setSelectedFile(null);
				return;
			}
			if (!SUPPORTED_FORMATS.includes(file.type)) {
				setUploadError(`Unsupported file type.`);
				setSelectedFile(null);
				return;
			}
			setSelectedFile(file);
			setPreviewUrl(URL.createObjectURL(file));
		} else {
			setSelectedFile(null);
		}
	};

	const handleCloseImageModal = () => {
		setIsImageModalOpen(false);
		setSelectedFile(null);
		setUploadError("");
		if (previewUrl) URL.revokeObjectURL(previewUrl);
		setPreviewUrl(null);
	};

	// --- Utility Handlers ---
	function handleGeneralModalCancel() {
		setIsGeneralModalOpen(false);
	}

	// --- Render Logic ---
	if (isLoading) return <p>Loading user data...</p>;
	if (isError) return <p>Error: {errorMessage}</p>;
	if (!caregiverDetail) return <p>User data not found or failed to load.</p>;

	const activeStatus = caregiverDetail.isActive;

	return (
		<>
			<PageLayout>
				{/* Header */}
				<div className={styles.header}>
					<h1>Caregiver Profile: {caregiverDetail.firstName} {caregiverDetail.lastName}</h1>
					<div className={styles.headerActions}>
						<Button
							variant="primary"
							icon={<Activity size={16} />}
							onClick={handleActive}
							className={`${activeStatus ? styles.inactive : styles.active}`}
							disabled={isActionPending}
						>
							{activeStatus ? "Inactive" : "Active"}
						</Button>
						<Link href="/caregivers">
							<Button variant="secondary" icon={<Undo2 size={16} />}>Back</Button>
						</Link>
					</div>
				</div>

				{/* Caregiver Overview */}
				<Card>
					<CardHeader>Caregiver Overview</CardHeader>
					<div className={styles.content}>
						<div className={styles.text}>
							<div className={styles.column}>
								<InfoField label="Caregiver ID">{caregiverDetail.employeeId}</InfoField>
								<InfoField label="Next Appointment">2024-08-05 (10:00 AM) default data</InfoField>
							</div>
							<div className={styles.column}>
								<InfoField label="Status">{activeStatus ? "Active" : "Inactive"}</InfoField>
								<InfoField label="Care Plan Status">On Track default data</InfoField>
							</div>
							<div className={styles.column}>
								<InfoField label="Last Shift">2024-07-28 default data</InfoField>
							</div>
						</div>
						<div className={styles.picture}>
							<Image
								src={caregiverDetail.profilePictureUrl || defaultAvatar}
								alt="Profile Photo"
								width={100}
								height={100}
								className={styles.image}
								unoptimized
							/>
							{/* Button to open the image upload modal */}
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

				{/* Tabbed Content */}
				<div className={styles.tabs}>
					<Tabs />
				</div>
			</PageLayout>

			{/* General Success/Error Modal */}
			<Modal isOpen={isGeneralModalOpen} onClose={handleGeneralModalCancel}>
				<h2>{message}</h2>
			</Modal>

			{/* Image Upload Modal */}
			<Modal isOpen={isImageModalOpen} onClose={handleCloseImageModal}>
				<div className={styles.centeredModalContainer}>
					<h2>Update Profile Picture</h2>
					<div className={styles.uploadModalContent}>
						<div className={styles.imagePreview}>
							<Image
								src={previewUrl || caregiverDetail.profilePictureUrl || defaultAvatar}
								alt="Preview"
								width={150}
								height={150}
								className={styles.image}
								unoptimized
							/>
						</div>

						{/* Custom styled file input label */}
						<label className={styles.fileInputLabelCustom}>
							Select File
							<input
								type="file"
								accept={SUPPORTED_FORMATS.join(',')}
								onChange={handleFileChange}
								className={styles.hiddenFileInput}
								disabled={uploading || isUploading}
							/>
						</label>

						{selectedFile && <p className={styles.fileName}>Selected: {selectedFile.name}</p>}

						{uploadError && <p className={styles.errorMessage}>{uploadError}</p>}

						<p className={styles.fileNote}>Max {MAX_FILE_SIZE / 1024}KB. Supported formats: JPG, PNG, WEBP.</p>

						<div className={styles.modalActions}>
							<Button variant="secondary" onClick={handleCloseImageModal} disabled={uploading || isUploading}>
								Cancel
							</Button>
							<Button
								variant="primary"
								onClick={handleImageUpload}
								disabled={!selectedFile || uploading || isUploading || !!uploadError}
							>
								{uploading || isUploading ? "Uploading..." : "Save Picture"}
							</Button>
						</div>
					</div>
				</div>
			</Modal>
		</>
	);
}
