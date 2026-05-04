import { useMutation, useQueryClient } from "@tanstack/react-query";
import { certService } from "@/services/api/services/certService";

/**
 * Custom hook to handle certificate operations (upload, delete) with automatic cache invalidation.
 * @param {string} userId - The ID of the user owning the certificate.
 */
export const useCertificates = (userId) => {
    const queryClient = useQueryClient();

    /**
     * Helper to parse the error message from the backend or the upload process.
     */
    const getErrorMessage = (err) => {
        return (
            err?.response?.data?.error ||
            err?.message ||
            "Upload failed"
        );
    };

    const uploadMutation = useMutation({
        // Link the hook to the service function
        mutationFn: async (formData) => {
            return certService.uploadCertificate(userId, formData);
        },

        // On success, tell React Query to re-fetch the user data
        onSuccess: () => {
            // Need to invalidate caregiver query so the UI updates
            queryClient.invalidateQueries({ queryKey: ['caregiver', userId] });
        }
    });

    const deleteMutation = useMutation({
        // We pass an object containing both IDs to the service
        mutationFn: (certId) => certService.deleteCertificate(certId, userId),
        onSuccess: () => {
            // Refresh user data so the deleted certificate disappears from the table
            queryClient.invalidateQueries({ queryKey: ['caregiver', userId] });
        }
    });

    return {
        // Upload
        uploadCertificate: uploadMutation.mutate,
        isCertificateUploading: uploadMutation.isPending,
        isCertificateSuccess: uploadMutation.isSuccess,
        isCertificateError: uploadMutation.isError,
        certificateErrorMessage: getErrorMessage(uploadMutation.error),
        resetUpload: uploadMutation.reset,

        // Delete
        deleteCertificate: deleteMutation.mutate,
        isCertificateDeleting: deleteMutation.isPending,
        isCertificateDeleteSuccess: deleteMutation.isSuccess,
        certificateDeleteErrorMessage: getErrorMessage(deleteMutation.error),
        resetDelete: deleteMutation.reset
    };
};