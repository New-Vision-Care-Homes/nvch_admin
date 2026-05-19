import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { focusNoteService } from "@/services/api/services/focusNoteService";

/**
 * Custom hook to manage all Focus Note operations (CRUD).
 *
 * @param {string} clientId - The client ID to fetch focus notes for.
 */
export const useFocusNotes = (clientId) => {
    const queryClient = useQueryClient();

    const getErrorMessage = (err) =>
        err?.response?.data?.error || err?.response?.data?.message || "An unexpected error occurred";

    // Fetch all focus notes for the client
    const focusNotesOfClientQuery = useQuery({
        queryKey: ["focusNotes", clientId],
        queryFn: () => focusNoteService.getByClientId(clientId),
        enabled: !!clientId,
        placeholderData: keepPreviousData,
    });

    // Update an existing focus note (only the three text fields)
    const updateMutation = useMutation({
        mutationFn: ({ focusNoteId, data }) => focusNoteService.update(focusNoteId, data),
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: ["focusNotes", clientId] });
            queryClient.invalidateQueries({ queryKey: ["focusNote", variables.focusNoteId] });
        },
    });

    const fetchError = focusNotesOfClientQuery.error;
    const actionError = updateMutation.error;

    return {
        // data.data = { focusNotes: [...], pagination: {...} }
        focusNotesOfClient: focusNotesOfClientQuery.data?.focusNotes ?? [],
        pagination: focusNotesOfClientQuery.data?.pagination ?? null,

        // Loading / pending
        isFocusNotesOfClientLoading: focusNotesOfClientQuery.isLoading,
        isActionPending: updateMutation.isPending,
        isUpdateSuccess: updateMutation.isSuccess,

        // Errors
        fetchError: fetchError ? getErrorMessage(fetchError) : null,
        actionError: actionError ? getErrorMessage(actionError) : null,

        // Methods
        updateFocusNote: updateMutation.mutate,
    };
};