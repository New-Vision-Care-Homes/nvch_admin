"use client";

import React, { useState, useEffect, useCallback } from "react";
// Assuming component paths are correct
import PageLayout from "@components/layout/PageLayout"; 
import Tabs from "./components/Tabs"; 
import Button from "@components/UI/Button";
import { Card, CardHeader, InfoField } from "@components/UI/Card";
import styles from "./caregiver_profile.module.css";
import Image from "next/image";
import Link from "next/link";
import { Activity, Undo2, Upload, Edit } from "lucide-react"; 
import Modal from "@components/UI/Modal";
import { useParams } from "next/navigation";

// Base URL for the User Management API
const API_BASE_URL = "https://nvch-server.onrender.com/api/auth/admin/users";
// Base URL for S3 Upload Endpoints (as defined in your documentation)
const S3_API_BASE_URL = "https://nvch-server.onrender.com/api/upload"; 

// --- File Upload Constants ---
const SUPPORTED_FORMATS = ["image/jpg", "image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 500 * 1024; // 500KB limit

export default function Page() {
    const { id } = useParams(); // The userId (MongoDB ObjectId) for the caregiver
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    
    // --- Image Upload States ---
    const [isImageModalOpen, setIsImageModalOpen] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [uploading, setUploading] = useState(false);
    
    // Modal state for general success/error messages
    const [isGeneralModalOpen, setIsGeneralModalOpen] = useState(false);
    const [message, setMessage] = useState("");

    const [error, setError] = useState(""); 
    
    // --- Helper Functions (S3 Upload Logic) ---

    /**
     * @description: Cleans up the temporary object URL to free up browser memory.
     */
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
            // --- Step 1: Get Pre-Signed URL (GET /api/upload/signed-url) ---
            const presignRes = await fetch(`${S3_API_BASE_URL}/signed-url?${queryParams}`, {
                method: "GET",
                headers: { Authorization: `Bearer ${token}` },
            });

            const presignData = await presignRes.json();
            console.log("presignData: ", presignData)

            if (!presignRes.ok || !presignData.success) {
                const errorDetail = presignData.message || presignData.error || "Failed to get signed URL.";
                throw new Error(errorDetail);
            }
            
            const { uploadUrl, fileKey } = presignData.data;

            // --- Step 2: Upload File Directly to S3 (PUT to the signed URL) ---
			//Error
			console.log("uploadUrl: ", uploadUrl);
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

            console.log("S3 Upload Successful. File Key:", fileKey);
            
            // --- Step 3: Update Database (PUT /api/upload/profile-picture) ---
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

    // 1. Fetch User Data (GET)
    const fetchUser = useCallback(async () => {
        setLoading(true);
        const token = localStorage.getItem("token");
        if (!token) {
            setMessage("Authentication failed. Please log in again.");
            setLoading(false);
            return;
        }

        try {
            const res = await fetch(`${API_BASE_URL}/${id}`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
            });

            const data = await res.json();

            if (res.ok) {
                setUser(data.data.user); 
            } else {
                setMessage(data.message || "Failed to fetch user data.");
                setIsGeneralModalOpen(true);
            }
        } catch (err) {
            console.error("Fetch User Error:", err);
            setMessage("Error connecting to server to fetch user data.");
            setIsGeneralModalOpen(true);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchUser();
    }, [fetchUser]);

    // 2. Handle Active/Inactive Status Update (PUT)
    const handleActive = async () => {  
        const token = localStorage.getItem("token");    
        if (!user || !token) return;

        const newActiveStatus = !user.isActive; 
        
        try {
            const res = await fetch(`${API_BASE_URL}/${id}`, {
                method: "PUT",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ isActive: newActiveStatus }),
            });
            
            const data = await res.json();
            
            if (res.ok) {
                const statusText = newActiveStatus ? "active" : "inactive";
                setUser(prevUser => ({
                    ...prevUser,
                    isActive: newActiveStatus,
                }));

                setMessage(`The user has been ${statusText}d`);
                setIsGeneralModalOpen(true);
            } else {
                setMessage(data.message || "Failed to update user status.");
                setIsGeneralModalOpen(true);
            }
        } catch (error) {
            console.error("Status Update Error:", error);
            setMessage("A critical error occurred during status update.");
            setIsGeneralModalOpen(true);
        }
    }

    // --- Image Modal UI Handlers ---
    
    /**
     * @description: Handles the file selection and creates a temporary preview URL.
     */
    const handleFileChange = (e) => {
        cleanupPreviewUrl(); 
        setError("");
        const file = e.target.files[0];
        
        if (file) {
            // Client-side validation check
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

    /**
     * @description: Closes the image upload modal and resets related states.
     */
    const handleCloseImageModal = () => {
        setIsImageModalOpen(false);
        setSelectedFile(null);
        setError("");
        cleanupPreviewUrl();
    };
    
    // --- Utility Handlers ---

    function handleGeneralModalCancel() {
        setIsGeneralModalOpen(false);
    }
    
    // --- Render Logic ---

    if (loading) return <p>Loading user data...</p>;
    if (!user) return <p>User data not found or failed to load.</p>;

    const activeStatus = user.isActive;
    
    // Construct the image URL from the stored S3 key
    // This URL is used to display the existing picture fetched from the backend.
    const profileImageUrl = user.profilePictureKey 
        ? `${S3_API_BASE_URL}/get-image?key=${user.profilePictureKey}` 
        : "/img/navbar/avatar.jpg"; // Default placeholder image

    return (
        <>
            <PageLayout>
                {/* Header */}
                <div className={styles.header}>
                    <h1>Caregiver Profile: {user.firstName} {user.lastName}</h1>
                    <div className={styles.headerActions}>
                        <Button
                            variant="primary"
                            icon={<Activity size={16} />}
                            onClick={handleActive}
                            className={`${activeStatus ? styles.inactive : styles.active}`}
                        >
                            {activeStatus ? "Inactive" : "Active"}
                        </Button>
                        <Link href="/caregivers">
                            <Button variant="secondary" icon={<Undo2 size={16}/>}>Back</Button>
                        </Link>
                    </div>
                </div>

                {/* Caregiver Overview */}
                <Card>
                    <CardHeader>Caregiver Overview</CardHeader>
                    <div className={styles.content}>
                        <div className={styles.text}>
                            <div className={styles.column}>
                                <InfoField label="Caregiver ID">{user.employeeId}</InfoField>
                                <InfoField label="Next Appointment">2024-08-05 (10:00 AM)</InfoField>
                            </div>
                            <div className={styles.column}>
                                <InfoField label="Status">{activeStatus ? "Active" : "Inactive"}</InfoField>
                                <InfoField label="Care Plan Status">On Track</InfoField>
                            </div>
                            <div className={styles.column}>
                                <InfoField label="Last Visit">2024-07-28</InfoField>
                            </div>
                        </div>
                        <div className={styles.picture}>
                            <Image
                                src={profileImageUrl}
                                alt="Profile Photo"
                                width={100}
                                height={100}
                                className={styles.image}
                                unoptimized={profileImageUrl !== "/img/navbar/avatar.jpg"} 
                            />
                            {/* Button to open the image upload modal */}
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
                                // Show selected file preview, or current profile image as fallback
                                src={previewUrl || profileImageUrl}
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
