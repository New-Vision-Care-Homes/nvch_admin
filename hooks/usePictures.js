import { useMutation, useQueryClient } from "@tanstack/react-query";
import { pictureService } from "@/api/services/pictureService";

/**
 * Custom hook to handle the multi-step profile picture upload process:
 * 1. Get a pre-signed URL from the backend.
 * 2. Upload the binary file directly to S3.
 * 3. Update the user's record in the database with the new file key.
 */
export const useProfileUpload = () => {
    const queryClient = useQueryClient();

    /**
     * Helper to parse the error message from the backend or the upload process.
     */
    const getErrorMessage = (err) => {
        return (
            err?.response?.data?.message || 
            err?.message || 
            "Upload failed"
        );
    };

    const mutation = useMutation({
        mutationFn: async ({ file, userId }) => {
            // Step 1: Request the Pre-signed URL from our API
            const presignData = await pictureService.getPresignedUrl({
                uploadType: "profile-picture",
                userId: userId,
                mimeType: file.type,
                fileSize: file.size.toString(),
            });

            if (!presignData.success) {
                throw new Error(presignData.message || "Failed to get upload URL");
            }
            
            const { uploadUrl, fileKey } = presignData.data;

            // Step 2: Perform the binary PUT request to S3
            await pictureService.uploadToS3(uploadUrl, file);

            // Step 3: Patch the Client/User record in the database
            return await pictureService.updateProfileRecord(fileKey);
        },
        onSuccess: (data, variables) => {
            // Invalidate the specific client and the lists to refresh the UI
            queryClient.invalidateQueries({ queryKey: ["clients"] });
            queryClient.invalidateQueries({ queryKey: ["caregivers"] });
            queryClient.invalidateQueries({ queryKey: ["client", variables.userId] });
            // Invalidate the image cache tag we used in useImageUrl
            queryClient.invalidateQueries({ queryKey: ["signedImage"] });
        }
    });

    return {
        uploadProfilePicture: mutation.mutate,
        isUploading: mutation.isPending,
        isSuccess: mutation.isSuccess,
        // Using consistent naming for errors
        isError: mutation.isError,
        uploadErrorMessage: mutation.isError ? getErrorMessage(mutation.error) : null,
        reset: mutation.reset
    };
};