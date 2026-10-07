import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { clientDocumentService } from "@/services/api/services/clientDocumentService";

/**
 * Custom hook to handle client document operations (list, upload, delete)
 * with automatic cache invalidation.
 * @param {string} clientId - The ID of the client owning the documents.
 */
export const useClientDocuments = (clientId) => {
	const queryClient = useQueryClient();

	const getErrorMessage = (err) => {
		return (
			err?.response?.data?.error ||
			err?.message ||
			"Upload failed"
		);
	};

	const documentsQuery = useQuery({
		queryKey: ['clientDocuments', clientId],
		queryFn: async () => {
			const { data } = await clientDocumentService.getClientDocuments(clientId);
			return data.data.documents;
		},
		enabled: !!clientId,
	});

	const uploadMutation = useMutation({
		mutationFn: async (formData) => {
			return clientDocumentService.uploadClientDocument(clientId, formData);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['clientDocuments', clientId] });
		}
	});

	const deleteMutation = useMutation({
		mutationFn: (documentId) => clientDocumentService.deleteClientDocument(documentId, clientId),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['clientDocuments', clientId] });
		}
	});

	return {
		// List
		documents: documentsQuery.data || [],
		isDocumentsLoading: documentsQuery.isLoading,
		documentsFetchError: documentsQuery.isError ? getErrorMessage(documentsQuery.error) : null,

		// Upload
		uploadDocument: uploadMutation.mutate,
		isDocumentUploading: uploadMutation.isPending,
		isDocumentSuccess: uploadMutation.isSuccess,
		isDocumentError: uploadMutation.isError,
		documentErrorMessage: getErrorMessage(uploadMutation.error),
		resetUpload: uploadMutation.reset,

		// Delete
		deleteDocument: deleteMutation.mutate,
		isDocumentDeleting: deleteMutation.isPending,
		isDocumentDeleteSuccess: deleteMutation.isSuccess,
		documentDeleteErrorMessage: getErrorMessage(deleteMutation.error),
		resetDelete: deleteMutation.reset
	};
};
