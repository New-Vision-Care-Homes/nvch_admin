import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { permissionService } from "@/services/api/services/permissionService";

/**
 * Fetches the canonical ordered list of valid permission slugs from the backend.
 *
 * Why use this instead of utils/permissions.js?
 * The backend is the source of truth. When a new slug is added server-side,
 * this hook picks it up automatically — no frontend code change needed.
 *
 * Cached for 10 minutes because the slug list almost never changes mid-session.
 */
export const usePermissionDefinitions = () => {
	const query = useQuery({
		queryKey: ["permissionDefinitions"],
		queryFn: permissionService.getDefinitions,
		staleTime: 10 * 60 * 1000, // 10 minutes — slug definitions rarely change
	});

	const getErrorMessage = (err) =>
		err?.response?.data?.details?.[0]?.msg ||
		err?.response?.data?.error ||
		"Failed to load permission definitions";

	return {
		permissionSlugs: query.data ?? [],                                        // flat array of all valid slugs
		isPermissionDefinitionsLoading: query.isLoading,
		permissionDefinitionsError: query.error ? getErrorMessage(query.error) : null,
		refetchDefinitions: query.refetch,
	};
};

/**
 * Manages all permission group operations: list, detail, create, update, delete.
 *
 * Supports three calling patterns:
 *   usePermissionGroups()                              → fetch list with no filters
 *   usePermissionGroups({ params: { page, limit } })  → fetch paginated list
 *   usePermissionGroups({ permissionGroupId: "abc" }) → fetch single group detail
 *
 * Only one query runs at a time — if permissionGroupId is provided the list
 * query is disabled, and vice versa.
 */
export const usePermissionGroups = (options = {}) => {
	const queryClient = useQueryClient();

	// --- Resolve calling pattern ---
	// Supports passing the ID directly as a string/number (legacy) or as an object key.
	const permissionGroupId =
		typeof options === 'string' || typeof options === 'number'
			? options
			: options.permissionGroupId;

	// Resolve query params for the list view.
	// Priority: options.params → options object itself (if no ID present).
	let params = {};
	if (typeof options === 'object') {
		if (options.params) {
			params = options.params;
		} else if (!options.permissionGroupId) {
			// Caller passed params directly: usePermissionGroups({ page: 1, limit: 8 })
			params = options;
		}
	}

	// --- Shared error extractor ---
	// Axios wraps HTTP errors; this digs out the most useful message.
	// details[0].msg comes from express-validator field errors.
	// error comes from our standard API error shape { success: false, error: "..." }.
	const getErrorMessage = (err) => {
		return (
			err?.response?.data?.details?.[0]?.msg ||
			err?.response?.data?.error ||
			"An unexpected error occurred"
		);
	};

	// --- Queries ---

	// List query — runs only when NO specific group ID is requested.
	// keepPreviousData: the old page stays visible while the next page loads,
	// preventing a blank flash between page changes.
	const permissionGroupsQuery = useQuery({
		queryKey: ["permissionGroups", params],
		queryFn: () => permissionService.getAll(params),
		enabled: !permissionGroupId,
		placeholderData: keepPreviousData,
	});

	// Detail query — runs only when a specific group ID is provided.
	const permissionGroupDetailQuery = useQuery({
		queryKey: ["permissionGroup", permissionGroupId],
		queryFn: () => permissionService.getPermissionGroup(permissionGroupId),
		enabled: !!permissionGroupId,
	});

	// --- Mutations ---

	const deleteMutation = useMutation({
		mutationFn: permissionService.delete,
		// After deleting, re-fetch the list so the deleted row disappears immediately.
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ["permissionGroups"] }),
	});

	const createMutation = useMutation({
		mutationFn: permissionService.create,
		// After creating, re-fetch the list so the new group appears immediately.
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ["permissionGroups"] }),
	});

	const updateMutation = useMutation({
		mutationFn: ({ id, data }) => permissionService.update(id, data),
		// Invalidate both the list (so the updated name/description shows there)
		// and the specific detail cache (so the edit form shows fresh data).
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ["permissionGroups"] });
			queryClient.invalidateQueries({ queryKey: ["permissionGroup", variables.id] });
		},
	});

	// --- Error separation ---
	// "Fetch errors" come from the initial data load → shown via <ErrorState> (full-page error UI).
	// "Action errors" come from create/update/delete → shown inline near the form or button.
	const fetchError = permissionGroupsQuery.error || permissionGroupDetailQuery.error;
	const actionError = deleteMutation.error || createMutation.error || updateMutation.error;

	return {
		// Data
		// getAll returns { permissionGroups, pagination } — extract each separately.
		permissionGroups: permissionGroupsQuery?.data?.permissionGroups ?? [],
		permissionGroupDetail: permissionGroupDetailQuery?.data,
		totalPages: permissionGroupsQuery?.data?.pagination?.totalPages ?? 0,
		currentPage: permissionGroupsQuery?.data?.pagination?.currentPage ?? 1,
		totalCount: permissionGroupsQuery?.data?.pagination?.totalCount ?? 0,

		// Loading states
		isPermissionGroupsLoading: permissionGroupsQuery.isLoading || permissionGroupDetailQuery.isLoading,
		isPermissionGroupsActionPending:
			createMutation.isPending ||
			updateMutation.isPending ||
			deleteMutation.isPending,

		// Errors
		permissionGroupsFetchError: fetchError ? getErrorMessage(fetchError) : null,   // use with <ErrorState>
		permissionGroupsActionError: actionError ? getErrorMessage(actionError) : null, // use inline

		// Methods
		addPermissionGroup: createMutation.mutate,
		updatePermissionGroup: updateMutation.mutate,
		deletePermissionGroup: deleteMutation.mutate,
		refetch: permissionGroupsQuery.refetch,
	};
};
