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

import { useQueryClient } from "@tanstack/react-query";
import { useUser } from "@/hooks/useUsers";
import { useImageUrl } from "@/hooks/useImageUrl";


// --- API Endpoints Configuration ---
const API_BASE_URL = "https://nvch-server.onrender.com/api/auth/admin/users";
const S3_API_BASE_URL = "https://nvch-server.onrender.com/api/upload";

// --- Constants for File Validation ---
const SUPPORTED_FORMATS = ["image/jpg", "image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 500 * 1024; // 500KB limit
const DEFAULT_AVATAR = "/img/navbar/avatar.jpg";

export default function Page() {
    const { id } = useParams();
	const queryClient = useQueryClient();

	// --- React Query Hooks ---
	const {
		data: user,
		isLoading,
		isError,
		refetch,
	  } = useUser(id);
	  
	const { imageUrl: displayImageUrl } = useImageUrl(user?.data?.user?.profilePicture);
    // --- Image Upload States ---
    const [isImageModalOpen, setIsImageModalOpen] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState("");

    // --- General UI States ---
    const [isGeneralModalOpen, setIsGeneralModalOpen] = useState(false);
    const [message, setMessage] = useState("");


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
        const token = localStorage.getItem("token");

        try {
            // Step 1: Request Pre-signed URL for S3 upload
            const query = new URLSearchParams({
                uploadType: "profile-picture",
                userId: id,
                mimeType: selectedFile.type,
                fileSize: selectedFile.size.toString(),
            }).toString();

            const presignRes = await fetch(`${S3_API_BASE_URL}/signed-url?${query}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const presignData = await presignRes.json();
            if (!presignData.success) throw new Error(presignData.message);

            const { uploadUrl, fileKey } = presignData.data;

            // Step 2: Binary PUT to S3
            const s3Res = await fetch(uploadUrl, { method: "PUT", body: selectedFile });
            if (!s3Res.ok) throw new Error("S3 Upload Failed");

            // Step 3: Patch User Record in DB
            const updateRes = await fetch(`${S3_API_BASE_URL}/profile-picture`, {
                method: "PUT",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ fileKey }),
            });

            if (updateRes.ok) {
                // Trigger imperative refresh to update UI immediately
                await refetch(); 

				queryClient.invalidateQueries({
					queryKey: ["signedImage"],
				});
                setMessage("Profile picture updated successfully!");
                setIsGeneralModalOpen(true);
                handleCloseImageModal();
            }
        } catch (err) {
            setUploadError(err.message);
        } finally {
            setUploading(false);
        }
    };

    /**
     * @function handleActive
     * @description Toggles user account status between Active and Inactive.
     */
    const handleActive = async () => {
        const token = localStorage.getItem("token");
        if (!user || !token) return;
        const newActiveStatus = !user.data.user.isActive;
        try {
            const res = await fetch(`${API_BASE_URL}/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ isActive: newActiveStatus }),
            });
            if (res.ok) {
                await refetch();
                setMessage(`User status updated to ${newActiveStatus ? "Active" : "Inactive"}`);
                setIsGeneralModalOpen(true);
            }
        } catch (error) {
            setMessage("Status update failed.");
            setIsGeneralModalOpen(true);
        }
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
        if (previewUrl) URL.revokeObjectURL(previewUrl); // Free browser memory
        setPreviewUrl(null);
    };

    if (isLoading) return <p>Loading user data...</p>;
    if (!user) return <p>User data not found.</p>;

    return (
        <>
            <PageLayout>
                <div className={styles.header}>
                    <h1>Client Profile: {user.firstName} {user.lastName}</h1>
                    <div className={styles.headerActions}>
                        <Button
                            variant="primary"
                            icon={<Activity size={16} />}
                            onClick={handleActive}
                            className={`${user.data.user.isActive ? styles.inactive : styles.active}`}
                        >
                            {user.data.user.isActive ? "Inactive" : "Active"}
                        </Button>
                        <Link href="/clients">
                            <Button variant="secondary" icon={<Undo2 size={16}/>}>Back</Button>
                        </Link>
                    </div>
                </div>

                <Card>
                    <CardHeader>Client Overview</CardHeader>
                    <div className={styles.content}>
                        <div className={styles.text}>
                            <div className={styles.column}>
                                <InfoField label="Client ID">{user.clientId}</InfoField>
                                <InfoField label="Status">{user.isActive ? "Active" : "Inactive"}</InfoField>
                            </div>
                            <div className={styles.column}>
                                <InfoField label="Care Plan Status">On Track</InfoField>
                                <InfoField label="Last Visit">2024-07-28</InfoField>
                            </div>
                        </div>
                        <div className={styles.picture}>
                            <Image
                                src={displayImageUrl}
                                alt="Profile"
                                width={100}
                                height={100}
                                className={styles.image}
                                unoptimized
                            />
                            <Button 
                                variant="secondary" 
                                size="sm" 
                                icon={<Upload size={16}/>}
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

            {/* General Feedback Modal */}
            <Modal isOpen={isGeneralModalOpen} onClose={() => setIsGeneralModalOpen(false)}>
                <h2>{message}</h2>
            </Modal>

            {/* Image Upload Popup */}
            <Modal isOpen={isImageModalOpen} onClose={handleCloseImageModal}>
                <div className={styles.centeredModalContainer}>
                    <h2>Update Profile Picture</h2>
                    <div className={styles.uploadModalContent}>
                        <div className={styles.imagePreview}>
                            <Image
                                // Show preview of selected file if available, otherwise current image
                                src={previewUrl || displayImageUrl || DEFAULT_AVATAR}
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

