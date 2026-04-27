import React, { useState, useEffect } from "react";
import Modal from "./Modal";
import Button from "./Button";
import Image from "next/image";
import styles from "./UploadModal.module.css";
// Fallback image used if the user doesn't have a profile picture yet
import defaultAvatar from "@/assets/img/navbar/avatar.jpg";
// Import our custom hook that interacts with the backend for uploading profile pictures
import { useProfileUpload } from "@/hooks/usePictures";

// Define the file formats we allow the user to select
const SUPPORTED_FORMATS = ["image/jpg", "image/jpeg", "image/png", "image/webp"];
// Define the maximum file size (500KB in bytes). 
// 1 KB = 1024 bytes, so 500 * 1024 = 512,000 bytes.
const MAX_FILE_SIZE = 500 * 1024; 

/**
 * Reusable Profile Picture Upload Modal Component.
 * @param {boolean} isOpen - Determines if the modal should be visible.
 * @param {function} onClose - Function to call when the modal is closed (e.g., clicking "Cancel" or outside the modal).
 * @param {string} userId - The ID of the user this profile picture belongs to.
 * @param {string} currentImageUrl - The URL of the user's current profile picture (to show in the preview before they select a new one).
 * @param {function} onSuccess - Optional callback executed after a successful upload.
 */
export default function ProfilePictureModal({ isOpen, onClose, userId, currentImageUrl, onSuccess }) {
	// Destructure the upload mutation from our custom hook.
	// `uploadProfilePicture` is the function we call to start the API request.
	// `isProfilePictureUploading` is a boolean that is true while the request is in progress.
	// `profilePictureErrorMessage` is a string containing any error message from the backend.
	const { uploadProfilePicture, isProfilePictureUploading, profilePictureErrorMessage } = useProfileUpload();
	
	// Local state to store the actual File object the user selected from their computer
	const [selectedFile, setSelectedFile] = useState(null);
	// Local state to store a temporary URL that the browser generates to preview the selected image
	const [previewUrl, setPreviewUrl] = useState(null);
	// Local state for validation errors (e.g., "File too large") before we even try to upload
	const [localError, setLocalError] = useState("");

	// --- Lifecycle Effect: Memory Management ---
	// This effect runs every time `previewUrl` changes.
	// It returns a cleanup function that runs right before the component unmounts, OR before `previewUrl` changes again.
	useEffect(() => {
		return () => {
			// `URL.createObjectURL` uses memory. We must revoke it when we're done to prevent memory leaks.
			if (previewUrl) URL.revokeObjectURL(previewUrl);
		};
	}, [previewUrl]);

	// --- Lifecycle Effect: Modal Reset ---
	// This effect runs every time `isOpen` changes (when the modal opens or closes).
	useEffect(() => {
		// If the modal just closed (isOpen is false)...
		if (!isOpen) {
			// Reset all local states so the modal is a blank slate the next time it opens.
			setSelectedFile(null);
			setLocalError("");
			if (previewUrl) {
				URL.revokeObjectURL(previewUrl);
				setPreviewUrl(null);
			}
		}
	}, [isOpen, previewUrl]);

	/**
	 * Triggered whenever the user selects a file using the hidden file input.
	 */
	const handleFileChange = (e) => {
		// Clear any previous errors
		setLocalError("");
		// Get the first file from the input event (since we don't allow multiple files)
		const file = e.target.files[0];

		if (file) {
			// Validation Step 1: Check if the file is larger than our 500KB limit
			if (file.size > MAX_FILE_SIZE) {
				// If too large, set an error and clear the selection
				setLocalError(`File is too large (max ${MAX_FILE_SIZE / 1024}KB).`);
				setSelectedFile(null);
				return;
			}
			// Validation Step 2: Check if the file type is in our allowed list (JPG, PNG, WEBP)
			if (!SUPPORTED_FORMATS.includes(file.type)) {
				// If invalid format, set an error and clear the selection
				setLocalError(`Unsupported file type. Use JPG, PNG or WEBP.`);
				setSelectedFile(null);
				return;
			}
			
			// If validation passes, save the File object in state
			setSelectedFile(file);
			// Generate a temporary local URL so we can show the user a preview of their new image
			setPreviewUrl(URL.createObjectURL(file));
		} else {
			// If the user canceled the file selection dialog, clear the state
			setSelectedFile(null);
		}
	};

	/**
	 * Triggered when the user clicks the "Save Picture" button.
	 */
	const handleImageUpload = async () => {
		// Safety check: don't do anything if no file is selected
		if (!selectedFile) return;
		
		// Clear any previous errors before starting the new upload
		setLocalError("");

		// Call the mutation function from `useProfileUpload`
		uploadProfilePicture(
			// Pass the required variables to the hook
			{ file: selectedFile, userId },
			{
				// This block runs if the upload is 100% successful
				onSuccess: () => {
					// Trigger the parent component's success callback if one was provided
					if (onSuccess) onSuccess();
					// Close the modal
					onClose();
				},
				// This block runs if the upload fails (e.g., S3 error, network failure)
				onError: (err) => {
					// Update the local error state to show the failure message on the modal
					setLocalError(`Image upload failed: ${err.message || "Failed to upload image."}`);
				}
			}
		);
	};

	return (
		// The base Modal component handles the dark overlay and centering
		<Modal isOpen={isOpen} onClose={onClose}>
			<div className={styles.centeredModalContainer}>
				<h2>Update Profile Picture</h2>
				<div className={styles.uploadModalContent}>
					
					{/* Circular Image Preview Section */}
					<div className={styles.imagePreview}>
						<Image
							// Show the newly selected image `previewUrl` first.
							// If they haven't selected one yet, show their current profile picture `currentImageUrl`.
							// If they have neither, show the generic `defaultAvatar`.
							src={previewUrl || currentImageUrl || defaultAvatar}
							alt="Preview"
							width={150}
							height={150}
							className={styles.image}
							// `unoptimized` prevents Next.js from trying to optimize external S3/temporary local URLs, which can cause errors
							unoptimized 
						/>
					</div>

					{/* Custom styled file input label. We style the <label> to look like a button, and hide the actual <input>. */}
					<label className={styles.fileInputLabelCustom}>
						Select File
						{/* Hidden actual file input. Clicking the label above triggers this input automatically. */}
						<input
							type="file"
							// Restrict the file browser to only show these formats
							accept={SUPPORTED_FORMATS.join(',')}
							// Trigger handleFileChange when a file is picked
							onChange={handleFileChange}
							className={styles.hiddenFileInput}
							// Disable the input while an upload is in progress
							disabled={isProfilePictureUploading}
						/>
					</label>

					{/* If a file is selected, display its name below the button */}
					{selectedFile && <p className={styles.fileName}>Selected: {selectedFile.name}</p>}

					{/* Display any validation error (localError) OR backend error (profilePictureErrorMessage) in red text */}
					{(localError || profilePictureErrorMessage) && (
						<p className={styles.errorMessage}>{localError || profilePictureErrorMessage}</p>
					)}

					{/* Help text letting the user know the size and format limits */}
					<p className={styles.fileNote}>Max {MAX_FILE_SIZE / 1024}KB. Supported formats: JPG, PNG, WEBP.</p>

					{/* Footer section containing Cancel and Save buttons */}
					<div className={styles.modalActions}>
						{/* Cancel button: closes the modal. Disabled during upload. */}
						<Button variant="secondary" onClick={onClose} disabled={isProfilePictureUploading}>
							Cancel
						</Button>
						
						{/* Save button: starts the upload. */}
						<Button
							variant="primary"
							onClick={handleImageUpload}
							// The button is disabled if: no file is selected, an upload is in progress, or there is an active validation error
							disabled={!selectedFile || isProfilePictureUploading || !!localError}
						>
							{/* Change the button text dynamically based on upload state */}
							{isProfilePictureUploading ? "Uploading..." : "Save Picture"}
						</Button>
					</div>
				</div>
			</div>
		</Modal>
	);
}
