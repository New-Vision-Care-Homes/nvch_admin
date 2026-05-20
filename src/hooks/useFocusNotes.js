import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { focusNoteService } from "@/services/api/services/focusNoteService";

/**
 * Custom hook to manage all Focus Note operations (CRUD).
 * 
 * Supports both an options object and legacy positional arguments.
 * 
 * Recommended Object usage: 
 * useFocusNotes({ clientId: '123', queryParams: { page: 1 } })
 * useFocusNotes({ shiftId: '456' })
 * useFocusNotes({ focusNoteId: '789' })
 */
export const useFocusNotes = (optionsOrClientId, queryParamsOpt = {}) => {
    const queryClient = useQueryClient();

    // Flexible arguments parsing:
    // If the first argument is an object and not null, we extract the keys.
    // Otherwise, we assume it's the old positional format: (clientId, queryParams)
    let clientId, shiftId, focusNoteId, queryParams;
    
    if (typeof optionsOrClientId === 'object' && optionsOrClientId !== null) {
        ({ clientId, shiftId, focusNoteId, queryParams = {} } = optionsOrClientId);
    } else {
        clientId = optionsOrClientId;
        queryParams = queryParamsOpt;
    }

    const getErrorMessage = (err) =>
        err?.response?.data?.error || err?.response?.data?.message || "An unexpected error occurred";

    // ─── 1. Query: List by Client ───────────────────────────────────────────
    const clientNotesQuery = useQuery({
        queryKey: ["focusNotes", "client", clientId, queryParams],
        queryFn: () => focusNoteService.getByClientId(clientId, queryParams),
        enabled: !!clientId,
        placeholderData: keepPreviousData,
    });

    // ─── 2. Query: List by Shift ────────────────────────────────────────────
    const shiftNotesQuery = useQuery({
        queryKey: ["focusNotes", "shift", shiftId, queryParams],
        queryFn: () => focusNoteService.getByShiftId(shiftId, queryParams),
        enabled: !!shiftId,
        placeholderData: keepPreviousData,
    });

    // ─── 3. Query: Single Note ──────────────────────────────────────────────
    const singleNoteQuery = useQuery({
        queryKey: ["focusNote", focusNoteId],
        queryFn: () => focusNoteService.getById(focusNoteId),
        enabled: !!focusNoteId,
    });

    // ─── 4. Mutation: Create ────────────────────────────────────────────────
    const createMutation = useMutation({
        mutationFn: (data) => focusNoteService.create(data),
        onSuccess: (newNote) => {
            // Automatically refresh the lists where this note might appear
            if (newNote?.client) {
                queryClient.invalidateQueries({ queryKey: ["focusNotes", "client", newNote.client] });
            }
            if (newNote?.shift) {
                queryClient.invalidateQueries({ queryKey: ["focusNotes", "shift", newNote.shift] });
            }
            queryClient.invalidateQueries({ queryKey: ["focusNotes"] }); // Fallback 
        },
    });

    // ─── 5. Mutation: Update ────────────────────────────────────────────────
    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => focusNoteService.update(id, data),
        onSuccess: (updatedNote, variables) => {
            queryClient.invalidateQueries({ queryKey: ["focusNote", variables.id] });
            if (updatedNote?.client) {
                queryClient.invalidateQueries({ queryKey: ["focusNotes", "client", updatedNote.client] });
            }
            if (updatedNote?.shift) {
                queryClient.invalidateQueries({ queryKey: ["focusNotes", "shift", updatedNote.shift] });
            }
            queryClient.invalidateQueries({ queryKey: ["focusNotes"] }); // Fallback
        },
    });

    // ─── 6. Mutation: Delete ────────────────────────────────────────────────
    const deleteMutation = useMutation({
        mutationFn: (id) => focusNoteService.delete(id),
        onSuccess: (deletedNote) => {
            if (deletedNote?.client) {
                queryClient.invalidateQueries({ queryKey: ["focusNotes", "client", deletedNote.client] });
            }
            if (deletedNote?.shift) {
                queryClient.invalidateQueries({ queryKey: ["focusNotes", "shift", deletedNote.shift] });
            }
            queryClient.invalidateQueries({ queryKey: ["focusNotes"] }); // Fallback
        },
    });

    // Determine active list for generic properties
    const activeListQuery = clientId ? clientNotesQuery : (shiftId ? shiftNotesQuery : null);

    return {
        // --- Generic List Data ---
        focusNotesList: activeListQuery?.data?.focusNotes ?? [],
        pagination: activeListQuery?.data?.pagination ?? null,
        isListLoading: activeListQuery?.isLoading ?? false,
        listError: activeListQuery?.error ? getErrorMessage(activeListQuery.error) : null,

        // --- Single Note Data ---
        focusNote: singleNoteQuery.data ?? null,
        isNoteLoading: singleNoteQuery.isLoading,
        noteError: singleNoteQuery.error ? getErrorMessage(singleNoteQuery.error) : null,

        // --- Legacy/Specific Client Data (Backward compatible with FocusNotes.js) ---
        focusNotesOfClient: clientNotesQuery.data?.focusNotes ?? [],
        isFocusNotesOfClientLoading: clientNotesQuery.isLoading,
        fetchError: clientNotesQuery.error ? getErrorMessage(clientNotesQuery.error) : null,

        // --- Legacy/Specific Action Properties (Backward compatible) ---
        isActionPending: updateMutation.isPending || createMutation.isPending || deleteMutation.isPending,
        isUpdateSuccess: updateMutation.isSuccess,
        actionError: (updateMutation.error || createMutation.error || deleteMutation.error) 
            ? getErrorMessage(updateMutation.error || createMutation.error || deleteMutation.error) 
            : null,

        // --- Mutations ---
        createFocusNote: createMutation.mutate,
        isCreatePending: createMutation.isPending,
        createError: createMutation.error ? getErrorMessage(createMutation.error) : null,

        updateFocusNote: updateMutation.mutate,
        isUpdatePending: updateMutation.isPending,
        updateError: updateMutation.error ? getErrorMessage(updateMutation.error) : null,

        deleteFocusNote: deleteMutation.mutate,
        isDeletePending: deleteMutation.isPending,
        deleteError: deleteMutation.error ? getErrorMessage(deleteMutation.error) : null,
    };
};