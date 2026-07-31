// ============================================================
// useTrainings.js
// ------------------------------------------------------------
// TanStack Query hook for admin-scheduled trainings (e.g. UMAB).
//
// Calling patterns:
//
//   // List (optionally filtered)
//   const { trainings } = useTrainings({ from: "2026-01-01", to: "2026-12-31", type: "UMAB" });
//
//   // Fetch a single training
//   const { training } = useTrainings(trainingId);   // string / number
//
// Returned from list queries:
//   trainings — Training[] (empty array while loading or on error)
//
// Returned from mutations:
//   createTraining, updateTraining, cancelTraining,
//   addAttendees, removeAttendee, setAttendeeStatus — mutate functions
//   isActionPending — true while any mutation is in flight
//   actionError     — human-readable string from the last failed mutation
// ============================================================

import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { trainingService } from "@/services/api/services/trainingService";

// ── Error message extractor ────────────────────────────────────────────────────
function getErrorMessage(err) {
    const responseData = err?.response?.data;
    if (!responseData) return "Network error. Please check your connection and try again.";
    if (Array.isArray(responseData.details) && responseData.details.length > 0) {
        return responseData.details.map((d) => d.msg).filter(Boolean).join("; ");
    }
    return responseData.error || "An unexpected error occurred.";
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export const useTrainings = (options = {}, { enabled = true } = {}) => {
    const queryClient = useQueryClient();

    // Detect detail mode: string or number = fetch by ID
    const isDetailMode = typeof options === "string" || typeof options === "number";
    const trainingId   = isDetailMode ? options : null;
    const params       = isDetailMode ? {} : options;

    // ── List query ─────────────────────────────────────────────────────────────
    const listQuery = useQuery({
        queryKey:        ["trainings", params],
        queryFn:         () => trainingService.getAll(params),
        enabled:         enabled && !isDetailMode,
        placeholderData: keepPreviousData,
    });

    // ── Detail query ───────────────────────────────────────────────────────────
    const detailQuery = useQuery({
        queryKey: ["training", trainingId],
        queryFn:  () => trainingService.getById(trainingId),
        enabled:  enabled && isDetailMode && !!trainingId,
    });

    const invalidateAll = (id) => {
        queryClient.invalidateQueries({ queryKey: ["trainings"] });
        if (id) queryClient.invalidateQueries({ queryKey: ["training", id] });
    };

    // ── Mutations ──────────────────────────────────────────────────────────────
    const createMutation = useMutation({
        mutationFn: (body) => trainingService.create(body),
        onSuccess:  () => invalidateAll(),
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, body }) => trainingService.update(id, body),
        onSuccess:  (_, variables) => invalidateAll(variables.id),
    });

    const cancelMutation = useMutation({
        mutationFn: (id) => trainingService.cancel(id),
        onSuccess:  (_, id) => invalidateAll(id),
    });

    const addAttendeesMutation = useMutation({
        mutationFn: ({ id, caregiverIds }) => trainingService.addAttendees(id, caregiverIds),
        onSuccess:  (_, variables) => invalidateAll(variables.id),
    });

    const removeAttendeeMutation = useMutation({
        mutationFn: ({ id, caregiverId }) => trainingService.removeAttendee(id, caregiverId),
        onSuccess:  (_, variables) => invalidateAll(variables.id),
    });

    const setAttendeeStatusMutation = useMutation({
        mutationFn: ({ id, caregiverId, body }) => trainingService.setAttendeeStatus(id, caregiverId, body),
        onSuccess:  (_, variables) => invalidateAll(variables.id),
    });

    // ── Error surfaces ─────────────────────────────────────────────────────────
    const fetchErrorRaw  = listQuery.error || detailQuery.error;
    const actionErrorRaw =
        createMutation.error ||
        updateMutation.error ||
        cancelMutation.error ||
        addAttendeesMutation.error ||
        removeAttendeeMutation.error ||
        setAttendeeStatusMutation.error;

    return {
        // List result
        trainings: listQuery.data?.trainings ?? [],

        // Detail result
        training: detailQuery.data?.training ?? null,

        // Status flags
        isLoading:       listQuery.isLoading || detailQuery.isLoading,
        isActionPending:
            createMutation.isPending ||
            updateMutation.isPending ||
            cancelMutation.isPending ||
            addAttendeesMutation.isPending ||
            removeAttendeeMutation.isPending ||
            setAttendeeStatusMutation.isPending,

        // Errors
        fetchError:  fetchErrorRaw  ? getErrorMessage(fetchErrorRaw)  : null,
        actionError: actionErrorRaw ? getErrorMessage(actionErrorRaw) : null,

        // Mutations
        createTraining:    createMutation.mutate,
        updateTraining:    updateMutation.mutate,
        cancelTraining:    cancelMutation.mutate,
        addAttendees:      addAttendeesMutation.mutate,
        removeAttendee:    removeAttendeeMutation.mutate,
        setAttendeeStatus: setAttendeeStatusMutation.mutate,

        refetch:       listQuery.refetch,
        refetchDetail: detailQuery.refetch,
    };
};
