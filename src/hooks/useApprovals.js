import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { approvalService } from "@/services/api/services/approvalService";

/**
 * Manages approval data and decision mutations.
 *
 * @param {string | object} options
 *   Pass an approval ID string to enter "detail mode".
 *   Pass an object for list/queue options:
 *   - approvalId {string}   – fetch a single approval
 *   - params     {object}   – list query params: page, limit
 *   - fetchQueue {boolean}  – fetch the queue (approvals the caller may decide)
 *   - fetchMine  {boolean}  – fetch the caller's own requests
 */
export const useApprovals = (options = {}) => {
	const queryClient = useQueryClient();

	const approvalId = typeof options === "string" ? options : options.approvalId;
	const params     = typeof options === "object" && options.params ? options.params : {};
	const fetchQueue = typeof options === "object" ? (options.fetchQueue ?? false) : false;
	const fetchMine  = typeof options === "object" ? (options.fetchMine  ?? false) : false;

	const getErrorMessage = (err) =>
		err?.response?.data?.details?.[0]?.msg ||
		err?.response?.data?.error ||
		"An unexpected error occurred";

	// ── Single approval detail ──────────────────────────────────────────────────
	const approvalDetailQuery = useQuery({
		queryKey: ["approval", approvalId],
		queryFn:  () => approvalService.getOne(approvalId),
		enabled:  !!approvalId,
	});

	// ── Queue (approvals the caller may decide) ─────────────────────────────────
	const queueQuery = useQuery({
		queryKey: ["approvals", "queue", params],
		queryFn:  () => approvalService.getQueue(params),
		enabled:  !approvalId && fetchQueue,
		placeholderData: keepPreviousData,
	});

	// we don't use this for admin side for now
	// ── Mine (the caller's own requests) ────────────────────────────────────────
	const mineQuery = useQuery({
		queryKey: ["approvals", "mine", params],
		queryFn:  () => approvalService.getMine(params),
		enabled:  !approvalId && fetchMine,
		placeholderData: keepPreviousData,
	});

	// ── Approve ─────────────────────────────────────────────────────────────────
	const approveMutation = useMutation({
		mutationFn: ({ id, reason }) => approvalService.approve(id, reason ? { reason } : {}),
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ["approval", variables.id] });
			queryClient.invalidateQueries({ queryKey: ["approvals"] });
			queryClient.invalidateQueries({ queryKey: ["notifications"] });
		},
	});

	// ── Reject ──────────────────────────────────────────────────────────────────
	const rejectMutation = useMutation({
		mutationFn: ({ id, reason }) => approvalService.reject(id, { reason }),
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ["approval", variables.id] });
			queryClient.invalidateQueries({ queryKey: ["approvals"] });
			queryClient.invalidateQueries({ queryKey: ["notifications"] });
		},
	});

	// ── Cancel ──────────────────────────────────────────────────────────────────
	const cancelMutation = useMutation({
		mutationFn: (id) => approvalService.cancel(id),
		onSuccess: (_, id) => {
			queryClient.invalidateQueries({ queryKey: ["approval", id] });
			queryClient.invalidateQueries({ queryKey: ["approvals"] });
			queryClient.invalidateQueries({ queryKey: ["notifications"] });
		},
	});

	// ── Aggregate errors ────────────────────────────────────────────────────────
	const fetchError =
		approvalDetailQuery.error ||
		queueQuery.error         ||
		mineQuery.error;

	return {
		// Data
		approvalDetail: approvalDetailQuery.data ?? null,
		approvals: (queueQuery.data ?? mineQuery.data)?.approvals ?? [],
		totalPages: (queueQuery.data ?? mineQuery.data)?.pagination?.pages ?? 0,
		currentPage: (queueQuery.data ?? mineQuery.data)?.pagination?.current ?? 1,
		totalCount: (queueQuery.data ?? mineQuery.data)?.pagination?.total ?? 0,

		// Loading
		isLoading: approvalDetailQuery.isLoading || queueQuery.isLoading || mineQuery.isLoading,
		isApprovePending: approveMutation.isPending,
		isRejectPending:  rejectMutation.isPending,
		isCancelPending:  cancelMutation.isPending,

		// Errors
		fetchError: fetchError ? getErrorMessage(fetchError) : null,
		approveError: approveMutation.error ? getErrorMessage(approveMutation.error) : null,
		rejectError:  rejectMutation.error  ? getErrorMessage(rejectMutation.error)  : null,
		cancelError:  cancelMutation.error  ? getErrorMessage(cancelMutation.error)  : null,

		// Actions
		approve: approveMutation.mutateAsync,
		reject:  rejectMutation.mutateAsync,
		cancel:  cancelMutation.mutateAsync,

		// Refetch
		refetch: approvalDetailQuery.refetch,
	};
};
