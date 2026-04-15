"use client";

import React, { useState, useEffect, useCallback } from "react";
import PageLayout from "@components/layout/PageLayout";
import Button from "@components/UI/Button";
import { Card, CardHeader, CardContent, InfoField, InputField } from "@components/UI/Card";
import styles from "./admin_profile.module.css";
import Image from "next/image";
import defaultAvatar from "@/assets/img/navbar/avatar.jpg";
import Link from "next/link";
import { Activity, Undo2, Upload, Edit, Save, X } from "lucide-react";
import Modal from "@components/UI/Modal";
import { useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { nameRule, emailRule, phoneRule } from "@/utils/validation";
import { useAdmins } from "@/hooks/useAdmins";

// Base URL for the User Management API
const API_BASE_URL = "https://nvch-server.onrender.com/api/auth/admin/users";
// Base URL for S3 Upload Endpoints
const S3_API_BASE_URL = "https://nvch-server.onrender.com/api/upload";

// --- File Upload Constants ---
const SUPPORTED_FORMATS = ["image/jpg", "image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 500 * 1024; // 500KB limit

const ADMIN_LEVEL_OPTIONS = [
	{ label: "Super Admin", value: "super" },
	{ label: "Manager", value: "manager" },
	{ label: "Supervisor", value: "supervisor" },
	{ label: "Staff", value: "staff" },
];

const DEPARTMENT_OPTIONS = [
	{ label: "Operations", value: "Operations" },
	{ label: "Human Resources", value: "Human Resources" },
	{ label: "Finance", value: "Finance" },
	{ label: "IT", value: "IT" },
	{ label: "Administration", value: "Administration" },
];

const schema = yup.object({
	firstName: nameRule.required("First name is required"),
	lastName: nameRule.required("Last name is required"),
	email: emailRule.required("Email is required"),
	phone: phoneRule.required("Phone number is required"),
	adminLevel: yup.string().required("Admin level is required"),
	department: yup.string().required("Department is required"),
	region: yup.string()
		.oneOf(["Central", "Windsor", "HRM", "Yarmouth", "Shelburne", "South Shore"], "Please select a valid region")
		.required("Region is required"),
});

export default function Page() {
	const { id } = useParams(); // The userId (MongoDB ObjectId) for the admin
	const [user, setUser] = useState(null);
	const [loading, setLoading] = useState(true);
	const [displayImageUrl, setDisplayImageUrl] = useState(defaultAvatar);

	// --- Editing State & Form Setup ---
	const [isEditing, setIsEditing] = useState(false);
	const { updateAdmin, isActionPending, toggleAdminStatus } = useAdmins();

	const [canManageUsers, setCanManageUsers] = useState(false);
	const [canManageShifts, setCanManageShifts] = useState(false);
	const [canViewReports, setCanViewReports] = useState(false);

	const { register, handleSubmit, formState: { errors }, reset } = useForm({
		resolver: yupResolver(schema),
	});

	// --- Image Upload States ---
	const [isImageModalOpen, setIsImageModalOpen] = useState(false);
	const [selectedFile, setSelectedFile] = useState(null);
	const [previewUrl, setPreviewUrl] = useState(null);
	const [uploading, setUploading] = useState(false);

	// Modal state for general success/error messages
	const [isGeneralModalOpen, setIsGeneralModalOpen] = useState(false);
	const [isStatusConfirmModalOpen, setIsStatusConfirmModalOpen] = useState(false);
	const [inlineMessage, setInlineMessage] = useState(null);
	const [message, setMessage] = useState("");
	const [error, setError] = useState("");

	// --- Helper Functions (S3 Upload Logic) ---
	const cleanupPreviewUrl = () => {
		if (previewUrl) {
			URL.revokeObjectURL(previewUrl);
			setPreviewUrl(null);
		}
	};

	const handleImageUpload = async () => {
		if (!selectedFile) return;

		setUploading(true);
		setError("");

		const file = selectedFile;
		const token = localStorage.getItem("token");

		if (file.size > MAX_FILE_SIZE || !SUPPORTED_FORMATS.includes(file.type)) {
			setError(`File size must be under ${MAX_FILE_SIZE / 1024}KB and be a valid image format.`);
			setUploading(false);
			return;
		}

		const queryParams = new URLSearchParams({
			uploadType: "profile-picture",
			userId: id,
			mimeType: file.type,
			fileSize: file.size.toString(),
		}).toString();

		try {
			// Step 1: Get Pre-Signed URL
			const presignRes = await fetch(`${S3_API_BASE_URL}/signed-url?${queryParams}`, {
				method: "GET",
				headers: { Authorization: `Bearer ${token}` },
			});

			const presignData = await presignRes.json();

			if (!presignRes.ok || !presignData.success) {
				const errorDetail = presignData.message || presignData.error || "Failed to get signed URL.";
				throw new Error(errorDetail);
			}

			const { uploadUrl, fileKey } = presignData.data;

			// Step 2: Upload File Directly to S3
			const s3UploadRes = await fetch(uploadUrl, {
				method: "PUT",
				headers: {
					"Content-Type": file.type,
				},
				body: file,
			});

			if (!s3UploadRes.ok) {
				throw new Error(`S3 direct upload failed with status: ${s3UploadRes.status}.`);
			}

			// Step 3: Update Database
			const updateRes = await fetch(`${S3_API_BASE_URL}/profile-picture`, {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({ fileKey: fileKey }),
			});

			const updateData = await updateRes.json();

			if (!updateRes.ok || !updateData.success) {
				const errorDetail = updateData.message || "Failed to update user record in database.";
				throw new Error(errorDetail);
			}

			await fetchUser();
			setMessage("Profile picture uploaded and saved successfully!");
			setIsGeneralModalOpen(true);
			handleCloseImageModal();

		} catch (err) {
			console.error("S3 Upload Error:", err);
			setError(`Image upload failed: ${err.message}`);
			setIsImageModalOpen(true);
		} finally {
			setUploading(false);
		}
	}

	// --- API Calls and Handlers (User Data) ---
	const fetchUser = useCallback(async () => {
		setLoading(true);
		const token = localStorage.getItem("token");
		try {
			const res = await fetch(`${API_BASE_URL}/${id}`, {
				method: "GET",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
			});
			const data = await res.json();
			if (data.success) {
				const fetchedUser = data.data.user;
				setUser(fetchedUser);
				reset({
					firstName: fetchedUser.firstName,
					lastName: fetchedUser.lastName,
					email: fetchedUser.email,
					phone: fetchedUser.phone,
					adminLevel: fetchedUser.adminLevel || "",
					department: fetchedUser.department || "",
					region: fetchedUser.region || "",
				});
				setCanManageUsers(fetchedUser.canManageUsers || false);
				setCanManageShifts(fetchedUser.canManageShifts || false);
				setCanViewReports(fetchedUser.canViewReports || false);
			} else {
				setMessage(data.message || "Failed to fetch user data.");
				setIsGeneralModalOpen(true);
			}
		} catch (err) {
			setMessage("Error connecting to server.");
			setIsGeneralModalOpen(true);
		} finally {
			setLoading(false);
		}
	}, [id, reset]);

	useEffect(() => {
		fetchUser();
	}, [fetchUser]);

	const getImageUrl = async (fileKey) => {
		if (!fileKey) return null;
		try {
			const token = localStorage.getItem("token");
			const res = await fetch(`${S3_API_BASE_URL}/file-url?fileKey=${encodeURIComponent(fileKey)}`, {
				method: "GET",
				headers: { Authorization: `Bearer ${token}` },
			});
			const result = await res.json();
			return result ? result : null;
		} catch (err) {
			console.error("Failed to get signed image URL:", err);
			return null;
		}
	};

	useEffect(() => {
		const refreshImageUrl = async () => {
			if (user?.profilePicture && !user.profilePicture.startsWith("/img")) {
				const signedUrl = await getImageUrl(user.profilePicture);
				if (signedUrl) setDisplayImageUrl(signedUrl);
			}
		};
		refreshImageUrl();
	}, [user?.profilePicture]);

	const handleActive = () => {
		setIsStatusConfirmModalOpen(true);
	};

	const confirmToggleStatus = () => {
		if (!user) return;
		toggleAdminStatus(id, {
			onSuccess: (data) => {
				const newActiveStatus = data?.data?.isActive ?? !user.isActive;
				setUser(prevUser => ({
					...prevUser,
					isActive: newActiveStatus,
				}));
				setIsStatusConfirmModalOpen(false);
				setInlineMessage({ type: 'success', text: data?.message || `The admin has been ${newActiveStatus ? "activated" : "deactivated"} successfully.` });
				setTimeout(() => setInlineMessage(null), 5000); // automatically clear after 5s
			},
			onError: (err) => {
				setIsStatusConfirmModalOpen(false);
				setInlineMessage({ type: 'error', text: `Failed to update admin status: ${err.message || "Unexpected error"}` });
				setTimeout(() => setInlineMessage(null), 5000);
			}
		});
	};

	const handleStatusConfirmCancel = () => {
		setIsStatusConfirmModalOpen(false);
	};

	const onSubmit = (data) => {
		const permissions = [];
		if (canManageUsers) permissions.push("manage_users");
		if (canManageShifts) permissions.push("manage_shifts");
		if (canViewReports) permissions.push("view_reports");

		const body = {
			...data,
			permissions,
			canManageUsers,
			canManageShifts,
			canViewReports,
		};

		updateAdmin({ id, data: body }, {
			onSuccess: () => {
				setIsEditing(false);
				setMessage("Admin updated successfully!");
				setIsGeneralModalOpen(true);
				fetchUser(); // Refresh data using existing endpoint
			},
			onError: (err) => {
				setMessage(`Failed to update admin: ${err.message || "Unexpected error"}`);
				setIsGeneralModalOpen(true);
			}
		});
	};

	const startEditing = () => {
		if (user) {
			reset({
				firstName: user.firstName,
				lastName: user.lastName,
				email: user.email,
				phone: user.phone,
				adminLevel: user.adminLevel || "",
				department: user.department || "",
				region: user.region || "",
			});
			setCanManageUsers(user.canManageUsers || false);
			setCanManageShifts(user.canManageShifts || false);
			setCanViewReports(user.canViewReports || false);
		}
		setIsEditing(true);
	};

	const cancelEditing = () => {
		setIsEditing(false);
	};

	// --- Image Modal UI Handlers ---
	const handleFileChange = (e) => {
		cleanupPreviewUrl();
		setError("");
		const file = e.target.files[0];

		if (file) {
			if (file.size > MAX_FILE_SIZE) {
				setError(`File is too large (max ${MAX_FILE_SIZE / 1024}KB).`);
				setSelectedFile(null);
				return;
			}
			if (!SUPPORTED_FORMATS.includes(file.type)) {
				setError(`Unsupported file type.`);
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
		setError("");
		setUploading(false);
		cleanupPreviewUrl();
	};

	function handleGeneralModalCancel() {
		setIsGeneralModalOpen(false);
	}

	// --- Render Logic ---
	if (loading) return <p>Loading admin data...</p>;
	if (!user) return <p>Admin data not found or failed to load.</p>;

	const activeStatus = user.isActive;

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
				<form onSubmit={handleSubmit(onSubmit)}>
					{/* Header */}
					<div className={styles.header}>
						<h1>{isEditing ? `Edit Admin Profile: ${user.firstName} ${user.lastName}` : `Admin Profile: ${user.firstName} ${user.lastName}`}</h1>
						<div className={styles.headerActions}>
							{!isEditing ? (
								<>
									<Button
										variant="primary"
										icon={<Edit size={16} />}
										onClick={startEditing}
										type="button"
									>
										Edit
									</Button>
									<Button
										variant={activeStatus ? "dangerLight" : "successLight"}
										icon={<Activity size={16} />}
										onClick={handleActive}
										type="button"
									>
										{activeStatus ? "Inactive" : "Active"}
									</Button>
									<Link href="/admins">
										<Button variant="secondary" icon={<Undo2 size={16} />} type="button">Back</Button>
									</Link>
								</>
							) : (
								<>
									<Button
										variant="secondary"
										icon={<X size={16} />}
										onClick={cancelEditing}
										type="button"
										disabled={isActionPending}
									>
										Cancel
									</Button>
									<Button
										variant="primary"
										icon={<Save size={16} />}
										type="submit"
										disabled={isActionPending}
									>
										{isActionPending ? "Saving..." : "Save"}
									</Button>
								</>
							)}
						</div>
					</div>

					{/* Admin Details */}
					<div className={styles.content}>
						<div className={styles.leftPanel}>
							{/* Basic Info */}
							<Card>
								<CardHeader>Basic Information</CardHeader>
								<CardContent>
									{!isEditing ? (
										<>
											<div className={styles.row2}>
												<InfoField label="First Name">{user.firstName}</InfoField>
												<InfoField label="Last Name">{user.lastName}</InfoField>
											</div>
											<div className={styles.row2}>
												<InfoField label="Email">{user.email}</InfoField>
												<InfoField label="Phone">{user.phone}</InfoField>
											</div>
											<div className={styles.row2}>
												<InfoField label="Status">
													<span className={`${styles.statusPill} ${activeStatus ? styles.statusActive : styles.statusInactive}`}>
														{activeStatus ? "Active" : "Inactive"}
													</span>
												</InfoField>
											</div>
										</>
									) : (
										<>
											<div className={styles.row2}>
												<InputField label="First Name" name="firstName" register={register} error={errors.firstName} />
												<InputField label="Last Name" name="lastName" register={register} error={errors.lastName} />
											</div>
											<div className={styles.row2}>
												<InputField label="Email" name="email" register={register} error={errors.email} />
												<InputField label="Phone" name="phone" type="phone" register={register} error={errors.phone} />
											</div>
										</>
									)}
								</CardContent>
							</Card>

							{/* Role & Department */}
							<Card>
								<CardHeader>Role &amp; Department</CardHeader>
								<CardContent>
									{!isEditing ? (
										<>
											<div className={styles.row2}>
												<InfoField label="Role">Admin</InfoField>
												<InfoField label="Admin Level">{user.adminLevel || "—"}</InfoField>
											</div>
											<div className={styles.row2}>
												<InfoField label="Department">{user.department || "—"}</InfoField>
												<InfoField label="Region">{user.region || "—"}</InfoField>
											</div>
										</>
									) : (
										<>
											<div className={styles.row2}>
												<InfoField label="Role">Admin</InfoField>
												<InputField
													label="Admin Level"
													name="adminLevel"
													type="select"
													register={register}
													error={errors.adminLevel}
													options={ADMIN_LEVEL_OPTIONS}
												/>
											</div>
											<div className={styles.row2}>
												<InputField
													label="Department"
													name="department"
													type="select"
													register={register}
													error={errors.department}
													options={DEPARTMENT_OPTIONS}
												/>
												<InputField
													label="Region"
													name="region"
													type="select"
													register={register}
													error={errors.region}
													options={[
														{ label: "Central", value: "Central" },
														{ label: "Windsor", value: "Windsor" },
														{ label: "HRM", value: "HRM" },
														{ label: "Yarmouth", value: "Yarmouth" },
														{ label: "Shelburne", value: "Shelburne" },
														{ label: "South Shore", value: "South Shore" }
													]}
												/>
											</div>
										</>
									)}
								</CardContent>
							</Card>

							{/* Permissions */}
							<Card>
								<CardHeader>Permissions</CardHeader>
								<CardContent>
									{!isEditing ? (
										<>
											<div className={styles.row2}>
												<InfoField label="Can Manage Users">{user.canManageUsers ? "Yes" : "No"}</InfoField>
												<InfoField label="Can Manage Shifts">{user.canManageShifts ? "Yes" : "No"}</InfoField>
											</div>
											<div className={styles.row2}>
												<InfoField label="Can View Reports">{user.canViewReports ? "Yes" : "No"}</InfoField>
											</div>
										</>
									) : (
										<div className={styles.checkboxGroup}>
											<label className={styles.checkboxLabel}>
												<input
													type="checkbox"
													checked={canManageUsers}
													onChange={() => setCanManageUsers(prev => !prev)}
												/>
												Manage Users
											</label>

											<label className={styles.checkboxLabel}>
												<input
													type="checkbox"
													checked={canManageShifts}
													onChange={() => setCanManageShifts(prev => !prev)}
												/>
												Manage Shifts
											</label>

											<label className={styles.checkboxLabel}>
												<input
													type="checkbox"
													checked={canViewReports}
													onChange={() => setCanViewReports(prev => !prev)}
												/>
												View Reports
											</label>
										</div>
									)}
								</CardContent>
							</Card>
						</div>

						{/* Picture Side Panel */}
						<div className={styles.rightPanel}>
							<Card>
								<CardHeader>Profile Picture</CardHeader>
								<CardContent>
									<div className={styles.picture}>
										<Image
											src={displayImageUrl}
											alt="Profile Photo"
											width={120}
											height={120}
											className={styles.image}
											unoptimized={displayImageUrl !== defaultAvatar}
										/>
										<Button
											variant="secondary"
											size="sm"
											icon={<Upload size={16} />}
											onClick={() => setIsImageModalOpen(true)}
											type="button"
										>
											Upload Picture
										</Button>
									</div>
								</CardContent>
							</Card>
						</div>
					</div>
				</form>
			</PageLayout>

			{/* Status Confirmation Modal */}
			<Modal isOpen={isStatusConfirmModalOpen} onClose={handleStatusConfirmCancel}>
				<div style={{ padding: '2rem 1rem', textAlign: 'center' }}>
					<h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem', color: '#1f2937' }}>
						Are you sure you want to {activeStatus ? "deactivate" : "activate"} this admin?
					</h2>
					<div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
						<Button variant="secondary" onClick={handleStatusConfirmCancel} disabled={isActionPending}>
							No, Cancel
						</Button>
						<Button variant="primary" onClick={confirmToggleStatus} disabled={isActionPending}>
							Yes, {activeStatus ? "Deactivate" : "Activate"}
						</Button>
					</div>
				</div>
			</Modal>

			{/* General Success/Error Modal */}
			<Modal isOpen={isGeneralModalOpen} onClose={handleGeneralModalCancel}>
				<h2>{message}</h2>
				<div className={styles.modalActions} style={{ justifyContent: 'center' }}>
					<Button variant="primary" onClick={handleGeneralModalCancel}>Close</Button>
				</div>
			</Modal>

			{/* Image Upload Modal */}
			<Modal isOpen={isImageModalOpen} onClose={handleCloseImageModal}>
				<div className={styles.centeredModalContainer}>
					<h2>Update Profile Picture</h2>
					<div className={styles.uploadModalContent}>
						<div className={styles.imagePreview}>
							<Image
								src={previewUrl || displayImageUrl}
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
								disabled={uploading}
							/>
						</label>

						{selectedFile && <p className={styles.fileName}>Selected: {selectedFile.name}</p>}

						{error && <p className={styles.errorMessage}>{error}</p>}

						<p className={styles.fileNote}>Max {MAX_FILE_SIZE / 1024}KB. Supported formats: JPG, PNG, WEBP.</p>

						<div className={styles.modalActions}>
							<Button variant="secondary" onClick={handleCloseImageModal} disabled={uploading}>
								Cancel
							</Button>
							<Button
								variant="primary"
								onClick={handleImageUpload}
								disabled={!selectedFile || uploading || !!error}
							>
								{uploading ? "Uploading..." : "Save Picture"}
							</Button>
						</div>
					</div>
				</div>
			</Modal>
		</>
	);
}
