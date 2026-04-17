import { useMutation, useQueryClient } from "@tanstack/react-query";
import { certService } from "@/services/api/services/certService";

/**
 * Custom hook to handle certificate uploads with automatic cache invalidation.
 * @param {string} userId - The ID of the user owning the certificate.
 */
export const useUploadCertificate = (userId) => {
    const queryClient = useQueryClient();

    return useMutation({
        // Link the hook to the service function
        mutationFn: (formData) => certService.uploadCertificate(userId, formData),
        
        // On success, tell React Query to re-fetch the user data
        onSuccess: () => {
            // Need to invalidate caregiver query so the UI updates
            queryClient.invalidateQueries({ queryKey: ['caregiver', userId] });
        }
    });
};

/**
 * Hook to handle certificate deletion
 */
export const useDeleteCertificate = (userId) => {
    const queryClient = useQueryClient();

    return useMutation({
        // We pass an object containing both IDs to the service
        mutationFn: (certId) => certService.deleteCertificate(certId, userId),
        onSuccess: () => {
            // Refresh user data so the deleted certificate disappears from the table
            queryClient.invalidateQueries({ queryKey: ['caregiver', userId] });
        }
    });
};