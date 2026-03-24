"use client";

import React, { useState, useEffect } from "react";

import { Card, CardHeader, InfoField } from "@components/UI/Card";
import Button from "@components/UI/Button";
import Image from "next/image";
import styles from "./profile.module.css";
import { useProfile } from "@/hooks/useProfile";
import { authService } from "@/api/services/authService";
import { Edit, Upload, Save, X } from "lucide-react";
import Modal from "@components/UI/Modal";
import { useProfileUpload } from "@/hooks/usePictures";

const DEFAULT_AVATAR = "/img/navbar/avatar.jpg";
const SUPPORTED_FORMATS = ["image/jpg", "image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 500 * 1024; // 500KB

export default function ProfilePage() {
	const { profile, isLoading, errorMessage } = useProfile();
	
	const [isEditing, setIsEditing] = useState(false);
	const [formData, setFormData] = useState({});
	const [isSaving, setIsSaving] = useState(false);
	const [saveError, setSaveError] = useState("");

	// Image Upload States
	const [isImageModalOpen, setIsImageModalOpen] = useState(false);
	const [selectedFile, setSelectedFile] = useState(null);
	const [previewUrl, setPreviewUrl] = useState(null);
	const [uploading, setUploading] = useState(false);
	const [uploadError, setUploadError] = useState("");
	const [generalMessage, setGeneralMessage] = useState("");
	const [isGeneralModalOpen, setIsGeneralModalOpen] = useState(false);

	const { uploadProfilePicture } = useProfileUpload();

	useEffect(() => {
		if (profile) {
			const user = profile?.data?.user || profile || {};
			setFormData({
				firstName: user.firstName || "",
				lastName: user.lastName || "",
				phone: user.phone || "",
				emergencyContactName: user.emergencyContactName || "",
				emergencyContactPhone: user.emergencyContactPhone || "",
				emergencyContactRelationship: user.emergencyContactRelationship || "",
			});
		}
	}, [profile]);

	if (isLoading) {
		return <div style={{ padding: '2rem' }}>Loading profile info...</div>;
	}

	if (errorMessage) {
		return <div style={{ color: 'red', padding: '2rem' }}>Error: {errorMessage}</div>;
	}

	if (!profile) {
		return <div style={{ padding: '2rem' }}>User not found.</div>;
	}

	const user = profile?.data?.user || profile || {};
	const formattedLastLogin = user.lastLogin ? new Date(user.lastLogin).toLocaleString() : "N/A";
	const formattedCreatedAt = user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "N/A";

	const handleInputChange = (e) => {
		const { name, value } = e.target;
		setFormData(prev => ({ ...prev, [name]: value }));
	};

	const handleSave = async () => {
		setIsSaving(true);
		setSaveError("");
		try {
			await authService.updateProfile(user.id || user._id, formData);
			setGeneralMessage("Profile updated successfully!");
			setIsGeneralModalOpen(true);
			setIsEditing(false);
			// Ideally we'd trigger a react-query refetch here, but reloading data via window or queryClient
			window.location.reload(); 
		} catch (error) {
			console.error("Failed to update profile", error);
			setSaveError(error?.response?.data?.message || "Failed to update profile. Please try again.");
		} finally {
			setIsSaving(false);
		}
	};

	const handleCancel = () => {
		setIsEditing(false);
		setSaveError("");
		setFormData({
			firstName: user.firstName || "",
			lastName: user.lastName || "",
			phone: user.phone || "",
			emergencyContactName: user.emergencyContactName || "",
			emergencyContactPhone: user.emergencyContactPhone || "",
			emergencyContactRelationship: user.emergencyContactRelationship || "",
		});
	};

	// --- Image Upload Handlers ---
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
			setPreviewUrl(URL.createObjectURL(file));
		}
	};

	const handleCloseImageModal = () => {
		setIsImageModalOpen(false);
		setSelectedFile(null);
		setUploadError("");
		if (previewUrl) URL.revokeObjectURL(previewUrl);
		setPreviewUrl(null);
	};

	const handleImageUpload = async () => {
		if (!selectedFile) return;
		setUploading(true);
		setUploadError("");

		uploadProfilePicture(
			{ file: selectedFile, userId: user.id || user._id },
			{
				onSuccess: () => {
					setGeneralMessage("Profile picture updated successfully!");
					setIsGeneralModalOpen(true);
					handleCloseImageModal();
					window.location.reload(); 
				},
				onError: (err) => {
					setUploadError(err?.message || "Failed to upload image.");
					setUploading(false);
				}
			}
		);
	};

	return (
		<>
				<div className={styles.header}>
					<h1 className={styles.title}>My Profile</h1>
					<div className={styles.headerActions}>
						{!isEditing ? (
							<Button variant="primary" icon={<Edit size={16} />} onClick={() => setIsEditing(true)}>
								Edit Profile
							</Button>
						) : (
							<>
								<Button variant="secondary" icon={<X size={16} />} onClick={handleCancel} disabled={isSaving}>
									Cancel
								</Button>
								<Button variant="primary" icon={<Save size={16} />} onClick={handleSave} disabled={isSaving}>
									{isSaving ? "Saving..." : "Save Changes"}
								</Button>
							</>
						)}
					</div>
				</div>

				{saveError && <div style={{ color: 'red', marginBottom: '1rem' }}>{saveError}</div>}

				<div className={styles.section}>
					<Card>
						<CardHeader>Personal Information</CardHeader>
						<div className={styles.content}>
							<div className={styles.picture}>
								<Image
									src={user.profilePicture || user.profilePictureUrl || DEFAULT_AVATAR}
									alt="Profile"
									width={120}
									height={120}
									className={styles.image}
									unoptimized
								/>
								<Button
									variant="secondary"
									size="sm"
									icon={<Upload size={16} />}
									onClick={() => setIsImageModalOpen(true)}
								>
									Update Picture
								</Button>
							</div>

							<div className={styles.text}>
								<div className={styles.column}>
									<InfoField label="ID">
										<input type="text" className={styles.inputField} value={user.id || user._id || "N/A"} disabled />
									</InfoField>
									<InfoField label="First Name">
										{isEditing ? (
											<input type="text" name="firstName" className={styles.inputField} value={formData.firstName} onChange={handleInputChange} />
										) : (user.firstName || "N/A")}
									</InfoField>
									<InfoField label="Last Name">
										{isEditing ? (
											<input type="text" name="lastName" className={styles.inputField} value={formData.lastName} onChange={handleInputChange} />
										) : (user.lastName || "N/A")}
									</InfoField>
									<InfoField label="Email">
										<input type="text" className={styles.inputField} value={user.email || "N/A"} disabled />
									</InfoField>
								</div>
								
								<div className={styles.column}>
									<InfoField label="Role">
										<span style={{ textTransform: "capitalize", padding: "0.5rem 0.75rem", display: "inline-block" }}>{user.role || "N/A"}</span>
									</InfoField>
									<InfoField label="Phone">
										{isEditing ? (
											<input type="text" name="phone" className={styles.inputField} value={formData.phone} onChange={handleInputChange} />
										) : (user.phone || "N/A")}
									</InfoField>
									<InfoField label="Status">
										<div style={{ padding: "0.5rem 0.75rem" }}>
											<span className={`${styles.statusBadge} ${user.isActive ? styles.active : styles.inactive}`}>
												{user.isActive ? "Active" : "Inactive"}
											</span>
										</div>
									</InfoField>
								</div>
								
								<div className={styles.column}>
									<InfoField label="Last Login">
										<div style={{ padding: "0.5rem 0.75rem" }}>{formattedLastLogin}</div>
									</InfoField>
									<InfoField label="Created At">
										<div style={{ padding: "0.5rem 0.75rem" }}>{formattedCreatedAt}</div>
									</InfoField>
								</div>
							</div>
						</div>
					</Card>
				</div>

				<div className={styles.section}>
					<Card>
						<CardHeader>Emergency Contact</CardHeader>
						<div className={styles.content}>
							<div className={styles.text} style={{ flexDirection: 'row' }}>
								<div className={styles.column}>
									<InfoField label="Name">
										{isEditing ? (
											<input type="text" name="emergencyContactName" className={styles.inputField} value={formData.emergencyContactName} onChange={handleInputChange} />
										) : (user.emergencyContactName || "N/A")}
									</InfoField>
								</div>
								<div className={styles.column}>
									<InfoField label="Phone">
										{isEditing ? (
											<input type="text" name="emergencyContactPhone" className={styles.inputField} value={formData.emergencyContactPhone} onChange={handleInputChange} />
										) : (user.emergencyContactPhone || "N/A")}
									</InfoField>
								</div>
								<div className={styles.column}>
									<InfoField label="Relationship">
										{isEditing ? (
											<input type="text" name="emergencyContactRelationship" className={styles.inputField} value={formData.emergencyContactRelationship} onChange={handleInputChange} />
										) : (user.emergencyContactRelationship || "N/A")}
									</InfoField>
								</div>
							</div>
						</div>
					</Card>
				</div>

			{/* General Feedback Modal */}
			<Modal isOpen={isGeneralModalOpen} onClose={() => setIsGeneralModalOpen(false)}>
				<h2>{generalMessage}</h2>
			</Modal>

			{/* Image Upload Popup */}
			<Modal isOpen={isImageModalOpen} onClose={handleCloseImageModal}>
				<div className={styles.centeredModalContainer}>
					<h2>Update Profile Picture</h2>
					<div className={styles.uploadModalContent}>
						<div className={styles.imagePreview}>
							<Image
								src={previewUrl || user.profilePicture || user.profilePictureUrl || DEFAULT_AVATAR}
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
