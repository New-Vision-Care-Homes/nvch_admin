// ============================================================
// useHolidays.js
// ------------------------------------------------------------
// TanStack Query hook for the stat-holiday calendar.
//
// Calling patterns:
//
//   // List by calendar year
//   const { holidays } = useHolidays({ year: 2026 });
//
//   // List by pay period
//   const { holidays } = useHolidays({ payYear: 2026, periodNumber: 13 });
//
//   // With isActive filter
//   const { holidays } = useHolidays({ year: 2026, isActive: "true" });
//
//   // Disable until params are ready
//   const { holidays } = useHolidays(params, { enabled: isReady });
//
//   // Fetch a single holiday
//   const { holiday } = useHolidays(holidayId);   // string / number
//
// Returned from list queries:
//   holidays      — Holiday[] (empty array while loading or on error)
//   year          — calendar year returned by the backend (year-mode only)
//   payPeriod     — { payYear, periodNumber } returned by the backend (period-mode only)
//
// Returned from mutations:
//   createHoliday, updateHoliday, deleteHoliday — mutate functions
//   isActionPending — true while any mutation is in flight
//   actionError     — human-readable string from the last failed mutation
// ============================================================

import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { holidayService } from "@/services/api/services/holidayService";

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
export const useHolidays = (options = {}, { enabled = true } = {}) => {
    const queryClient = useQueryClient();

    // Detect detail mode: string or number = fetch by ID
    const isDetailMode = typeof options === "string" || typeof options === "number";
    const holidayId    = isDetailMode ? options : null;
    const params       = isDetailMode ? {} : options;

    // ── List query ─────────────────────────────────────────────────────────────
    const listQuery = useQuery({
        queryKey:        ["holidays", params],
        queryFn:         () => holidayService.getAll(params),
        enabled:         enabled && !isDetailMode,
        placeholderData: keepPreviousData,
    });

    // ── Detail query ───────────────────────────────────────────────────────────
    const detailQuery = useQuery({
        queryKey: ["holiday", holidayId],
        queryFn:  () => holidayService.getById(holidayId),
        enabled:  enabled && isDetailMode && !!holidayId,
    });

    // ── Mutations ──────────────────────────────────────────────────────────────
    const createMutation = useMutation({
        mutationFn: (body) => holidayService.create(body),
        onSuccess:  () => queryClient.invalidateQueries({ queryKey: ["holidays"] }),
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, body }) => holidayService.update(id, body),
        onSuccess:  (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ["holidays"] });
            queryClient.invalidateQueries({ queryKey: ["holiday", variables.id] });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => holidayService.delete(id),
        onSuccess:  () => queryClient.invalidateQueries({ queryKey: ["holidays"] }),
    });

    // ── Error surfaces ─────────────────────────────────────────────────────────
    const fetchErrorRaw  = listQuery.error || detailQuery.error;
    const actionErrorRaw = createMutation.error || updateMutation.error || deleteMutation.error;

    return {
        // List result
        holidays:  listQuery.data?.holidays  ?? [],
        year:      listQuery.data?.year,
        payPeriod: listQuery.data?.payPeriod,

        // Detail result
        holiday: detailQuery.data?.holiday ?? null,

        // Status flags
        isLoading:       listQuery.isLoading || detailQuery.isLoading,
        isActionPending: createMutation.isPending || updateMutation.isPending || deleteMutation.isPending,

        // Errors
        fetchError:  fetchErrorRaw  ? getErrorMessage(fetchErrorRaw)  : null,
        actionError: actionErrorRaw ? getErrorMessage(actionErrorRaw) : null,

        // Mutations
        createHoliday: createMutation.mutate,
        updateHoliday: updateMutation.mutate,
        deleteHoliday: deleteMutation.mutate,

        refetch: listQuery.refetch,
    };
};
