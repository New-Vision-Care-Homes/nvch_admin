

import axiosClient from '../axiosClient';
import { API_ENDPOINTS } from '../endpoints';

/**
 * Service (layer) object containing all Certificate-related API calls.
 */
export const certService = {
	/**
	 * Executes the full certification upload workflow:
	 * 1. Get S3 Signed URL
	 * 2. Upload file directly to S3
	 * 3. Save certificate metadata to MongoDB
	 */
	async uploadCertificate(userId, formData) {
		const file = formData.file[0];

		// STEP 1: Request a signed URL from the backend
		const { data: { data: { uploadUrl, fileKey } } } = await axiosClient.get(API_ENDPOINTS.UPLOAD.GET_PRE_SIGNED_URL, {
			params: {
				uploadType: 'certificate',
				userId: userId,
				mimeType: file.type,
				fileSize: file.size,
				certificateType: formData.name
			}
		});

		// STEP 2: Upload the binary file directly to AWS S3 bucket
		const s3Response = await fetch(uploadUrl, {
			method: 'PUT',
			body: file,
			headers: { 'Content-Type': file.type }
		});
		if (!s3Response.ok) throw new Error("Cloud Storage upload failed");

		// STEP 3: Save metadata (name, dates, file key) to our database
		const dbPayload = {
			userId,
			fileKey,
			name: formData.name,
			// Format dates to ISO strings for database consistency
			startDate: new Date(formData.issueDate).toISOString(),
			expiryDate: new Date(formData.expiryDate).toISOString(),
			// Auto-calculate renewal date (1 month before expiry)
			renewalDate: new Date(new Date(formData.expiryDate).setMonth(new Date(formData.expiryDate).getMonth() - 1)).toISOString()
		};

		return axiosClient.post(API_ENDPOINTS.UPLOAD.CERTIFICATE, dbPayload);
	},

	/**
	 * Delete a certificate by its ID
	 * @param {string} certId - The unique ID of the certificate to remove
	 */
	async deleteCertificate(certId, userId) {
		return axiosClient.delete(API_ENDPOINTS.UPLOAD.CERTIFICATE, {
			data: {
				certificateId: certId,
				userId: userId
			}
		});
	}
};