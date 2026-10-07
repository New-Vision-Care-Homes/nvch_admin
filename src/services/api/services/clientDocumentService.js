import axiosClient from '../axiosClient';
import { API_ENDPOINTS } from '../endpoints';

/**
 * Service (layer) object containing all Client Document-related API calls.
 */
export const clientDocumentService = {
	/**
	 * Executes the full client document upload workflow:
	 * 1. Get S3 Signed URL
	 * 2. Upload file directly to S3
	 * 3. Save document metadata to MongoDB
	 */
	async uploadClientDocument(clientId, formData) {
		const file = formData.file[0];

		// STEP 1: Request a signed URL from the backend
		const { data: { data: { uploadUrl, fileKey } } } = await axiosClient.get(API_ENDPOINTS.UPLOAD.GET_PRE_SIGNED_URL, {
			params: {
				uploadType: 'client-document',
				userId: clientId,
				mimeType: file.type,
				fileSize: file.size,
				documentType: formData.type
			}
		});

		// STEP 2: Upload the binary file directly to AWS S3 bucket
		const s3Response = await fetch(uploadUrl, {
			method: 'PUT',
			body: file,
			headers: { 'Content-Type': file.type }
		});
		if (!s3Response.ok) throw new Error("Cloud Storage upload failed");

		// STEP 3: Save metadata (type, file key) to our database
		return axiosClient.post(API_ENDPOINTS.UPLOAD.CLIENT_DOCUMENT, { fileKey, type: formData.type });
	},

	/**
	 * Delete a client document by its ID.
	 */
	async deleteClientDocument(documentId, clientId) {
		return axiosClient.delete(API_ENDPOINTS.UPLOAD.CLIENT_DOCUMENT, {
			data: {
				documentId,
				clientId
			}
		});
	},

	/**
	 * List all documents on file for a client, each with a short-lived signed URL.
	 */
	async getClientDocuments(clientId) {
		return axiosClient.get(API_ENDPOINTS.UPLOAD.CLIENT_DOCUMENT, {
			params: { clientId }
		});
	}
};
