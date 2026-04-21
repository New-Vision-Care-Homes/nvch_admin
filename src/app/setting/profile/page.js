"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
// Importing custom validation rules
import { phoneRule, shortTextRule } from "@/utils/validation";

import { Card, CardHeader, InfoField, InputField } from "@components/UI/Card";
import Button from "@components/UI/Button";
import Image from "next/image";
import styles from "./profile.module.css";
import { useProfile } from "@/hooks/useProfile";
import ErrorState from "@components/UI/ErrorState";
import { Edit, Upload, Save, X } from "lucide-react";
import Modal from "@components/UI/Modal";
import { useProfileUpload } from "@/hooks/usePictures";

import defaultAvatar from "@/assets/img/navbar/avatar.jpg";
const SUPPORTED_FORMATS = ["image/jpg", "image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 500 * 1024; // 500KB

const schema = yup.object({
	phone: phoneRule,
	emergencyContactName: shortTextRule,
	emergencyContactPhone: phoneRule,
	emergencyContactRelationship: shortTextRule,
});

export default function ProfilePage() {
	const { profile, updateProfile, isLoading, isActionPending, fetchError, actionError, refetch } = useProfile();

	const [isEditing, setIsEditing] = useState(false);

	const { register, handleSubmit, formState: { errors }, reset } = useForm({
		resolver: yupResolver(schema),
		defaultValues: {
			phone: profile?.phone || "",
			emergencyContactName: profile?.emergencyContact?.name || profile?.emergencyContactName || "",
			emergencyContactPhone: profile?.emergencyContact?.phone || profile?.emergencyContactPhone || "",
			emergencyContactRelationship: profile?.emergencyContact?.relationship || profile?.emergencyContactRelationship || "",
		}
	});

	// Image Upload States
	const [isImageModalOpen, setIsImageModalOpen] = useState(false);
	const [selectedFile, setSelectedFile] = useState(null);
	const [previewUrl, setPreviewUrl] = useState(null);
	const [uploading, setUploading] = useState(false);
	const [uploadError, setUploadError] = useState("");

	const { uploadProfilePicture } = useProfileUpload();


	const onSubmit = (data) => {
		const body = {
			phone: data.phone,
			emergencyContact: {
				name: data.emergencyContactName,
				phone: data.emergencyContactPhone,
				relationship: data.emergencyContactRelationship,
			},
		};
		updateProfile(body, {
			onSuccess: () => {
				setIsEditing(false);
			},
		});
	};

	const handleCancel = () => {
		setIsEditing(false);
		reset({
			phone: profile?.phone || "",
			emergencyContactName: profile?.emergencyContact?.name || profile?.emergencyContactName || "",
			emergencyContactPhone: profile?.emergencyContact?.phone || profile?.emergencyContactPhone || "",
			emergencyContactRelationship: profile?.emergencyContact?.relationship || profile?.emergencyContactRelationship || "",
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
		setUploading(false);
		if (previewUrl) URL.revokeObjectURL(previewUrl);
		setPreviewUrl(null);
	};

	const handleImageUpload = async () => {
		if (!selectedFile) return;
		setUploading(true);
		setUploadError("");

		uploadProfilePicture(
			{ file: selectedFile, profileId: profile?.id || profile?._id },
			{
				onSuccess: () => {
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

	const formattedLastLogin = profile?.lastLogin ? new Date(profile.lastLogin).toLocaleString() : "N/A";
	const formattedCreatedAt = profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : "N/A";

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
							<Button variant="secondary" icon={<X size={16} />} onClick={handleCancel} disabled={isActionPending}>
								Cancel
							</Button>
							<Button variant="primary" icon={<Save size={16} />} onClick={handleSubmit(onSubmit)} disabled={isActionPending}>
								{isActionPending ? "Saving..." : "Save Changes"}
							</Button>
						</>
					)}
				</div>
			</div>

			{/* Action error — shown when delete/create/update fails */}
			{actionError && (
				<p className={styles.actionError}>{actionError}</p>
			)}

			{/* Fetch error or loading state */}
			<ErrorState
				isLoading={isLoading}
				errorMessage={fetchError}
				onRetry={refetch}
			/>


			{!fetchError && !isLoading && profile && (
				<>
					<div className={styles.section}>
						<Card>
							<CardHeader>Personal Information</CardHeader>
							<div className={styles.content}>
								<div className={styles.picture}>
									<Image
										src={profile.profilePictureUrl || defaultAvatar}
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

								<div className={styles.infoGrid}>
									<InfoField label="Status">
										<div className={styles.paddingVal}>
											<span className={`${styles.statusBadge} ${profile.isActive ? styles.active : styles.inactive}`}>
												{profile.isActive ? "Active" : "Inactive"}
											</span>
										</div>
									</InfoField>

									<InfoField label="First Name" value={profile.firstName || "N/A"} />

									<InfoField label="Last Name" value={profile.lastName || "N/A"} />

									<InfoField label="ID" value={profile.id || "N/A"} />

									<InfoField label="Email" value={profile.email || "N/A"} />

									<InfoField label="Role">
										<span className={styles.paddingVal} style={{ textTransform: "capitalize", display: "inline-block" }}>{profile.role || "N/A"}</span>
									</InfoField>

									{isEditing ? (
										<InputField label="Phone" name="phone" type="phone" register={register} error={errors.phone} />
									) : (
										<InfoField label="Phone" value={profile.phone || "N/A"} />
									)}

									<InfoField label="Region" value={profile.region || "N/A"} />

									<InfoField label="Date of Birth" value={profile.dateOfBirth ? new Date(profile.dateOfBirth).toLocaleDateString() : "N/A"} />
								</div>
							</div>
						</Card>
					</div>

					<div className={styles.section}>
						<Card>
							<CardHeader>Emergency Contact</CardHeader>
							<div className={styles.content}>
								<div className={styles.infoGrid}>
									{isEditing ? (
										<InputField label="Name" name="emergencyContactName" register={register} error={errors.emergencyContactName} />
									) : (
										<InfoField label="Name" value={profile.emergencyContact?.name || profile.emergencyContactName || "N/A"} />
									)}
									{isEditing ? (
										<InputField label="Phone" name="emergencyContactPhone" type="phone" register={register} error={errors.emergencyContactPhone} />
									) : (
										<InfoField label="Phone" value={profile.emergencyContact?.phone || profile.emergencyContactPhone || "N/A"} />
									)}
									{isEditing ? (
										<InputField label="Relationship" name="emergencyContactRelationship" register={register} error={errors.emergencyContactRelationship} />
									) : (
										<InfoField label="Relationship" value={profile.emergencyContact?.relationship || profile.emergencyContactRelationship || "N/A"} />
									)}
								</div>
							</div>
						</Card>
					</div>

					<div className={styles.section}>
						<div className={styles.gridContainer}>
							<Card className={styles.fullHeight}>
								<CardHeader>Administrative Details</CardHeader>
								<div className={styles.text}>
									<div className={styles.column}>
										<InfoField label="Department" value={profile.department || "N/A"} />
										<InfoField label="Admin Level" value={profile.adminLevel || "N/A"} />
										<InfoField label="Permissions">
											<div className={styles.tagGroup}>
												{(profile.permissions && profile.permissions.length > 0) ? (
													profile.permissions.map((perm, index) => (
														<span key={index} className={styles.tag}>{perm.replace(/_/g, ' ')}</span>
													))
												) : "No specific permissions"}
											</div>
										</InfoField>
									</div>
								</div>
							</Card>

							<Card className={styles.fullHeight}>
								<CardHeader>Access & Activity</CardHeader>
								<div className={styles.text}>
									<div className={styles.column}>
										<InfoField label="Access Controls">
											<div className={styles.accessGroup}>
												<div className={styles.accessItem}>
													<span className={profile.canManageprofiles ? styles.check : styles.uncheck}>{profile.canManageprofiles ? "✓" : "✗"}</span>
													<span>Manage profiles</span>
												</div>
												<div className={styles.accessItem}>
													<span className={profile.canManageShifts ? styles.check : styles.uncheck}>{profile.canManageShifts ? "✓" : "✗"}</span>
													<span>Manage Shifts</span>
												</div>
												<div className={styles.accessItem}>
													<span className={profile.canViewReports ? styles.check : styles.uncheck}>{profile.canViewReports ? "✓" : "✗"}</span>
													<span>View Reports</span>
												</div>
											</div>
										</InfoField>
										<div className={styles.timeline}>
											<InfoField label="Created At" value={formattedCreatedAt} />
											<InfoField label="Last Login" value={formattedLastLogin} />
										</div>
									</div>
								</div>
							</Card>
						</div>
					</div>
				</>
			)}

			{/* Image Upload Popup */}
			<Modal isOpen={isImageModalOpen} onClose={handleCloseImageModal}>
				<div className={styles.centeredModalContainer}>
					<h2>Update Profile Picture</h2>
					<div className={styles.uploadModalContent}>
						<div className={styles.imagePreview}>
							<Image
								src={previewUrl || profile?.profilePicture || profile?.profilePictureUrl || defaultAvatar}
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
