import axiosClient from '../axiosClient';
import { API_ENDPOINTS } from '../endpoints';

/**
 * Service to handle file uploads via S3 pre-signed URLs.
 */
export const pictureService = {
	/**
	 * Step 1: Request a pre-signed URL from our backend
	 * @param {Object} params - { uploadType, userId, mimeType, fileSize }
	 */
	getPresignedUrl: async (params) => {
		const query = new URLSearchParams(params).toString();
		const { data } = await axiosClient.get(`${API_ENDPOINTS.UPLOAD.GET_PRE_SIGNED_URL}?${query}`);
		return data; // Expected format: { success: true, data: { uploadUrl, fileKey } }
	},

	/**
	 * Step 2: Direct binary upload to S3 (No Auth header needed for S3)
	 */
	uploadToS3: async (uploadUrl, file) => {
		const response = await fetch(uploadUrl, {
			method: "PUT",
			body: file,
			headers: { "Content-Type": file.type }
		});
		if (!response.ok) throw new Error("Binary upload to S3 failed");
		return true;
	},

	/**
	 * Step 3: Confirm upload and update user record in DB
	 */
	updateProfileRecord: async (fileKey) => {
		const { data } = await axiosClient.put(API_ENDPOINTS.UPLOAD.PROFILE_PICTURE, { fileKey });
		return data;
	}
};