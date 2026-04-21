import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { permissionService } from "@/services/api/services/permissionService";

/**
 * Custom hook to manage all permission group operations (CRUD).
 *
 * @param {Object} options
 * @param {string|number} options.permissionGroupId - Optional ID to fetch specific permission group details
 * @param {Object} options.params - Optional query parameters for the list (search, limit, page)
 */
export const usePermissionGroups = (options = {}) => {
	const queryClient = useQueryClient();

	const permissionGroupId = typeof options === 'string' || typeof options === 'number' ? options : options.permissionGroupId;
	let params = {};
	if (typeof options === 'object') {
		if (options.params) {
			params = options.params;
		} else if (!options.permissionGroupId) {
			params = options;
		}
	}

	/**
	 * Extracts the most relevant error message from an Axios error object.
	 */
	const getErrorMessage = (err) => {
		return (
			err?.response?.data?.details[0]?.msg ||
			err?.response?.data?.error ||
			"An unexpected error occurred"
		);
	};

	// --- Queries ---

	// 1. Fetch all clients for the list view
	const permissionGroupsQuery = useQuery({
		queryKey: ["permissionGroups", params],
		queryFn: () => permissionService.getAll(params),
		enabled: !permissionGroupId,
		placeholderData: keepPreviousData, // Keep showing old results while fetching new ones (prevents flash)
	});

	// 2. Fetch a single client's details
	const permissionGroupDetailQuery = useQuery({
		queryKey: ["permissionGroup", permissionGroupId],
		queryFn: () => permissionService.getPermissionGroup(permissionGroupId),
		enabled: !!permissionGroupId,
	});

	// --- Mutations ---

	// 3. Delete a permission group record
	const deleteMutation = useMutation({
		mutationFn: permissionService.delete,
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ["permissionGroups"] }),
	});

	// 4. Create a new permission group record
	const createMutation = useMutation({
		mutationFn: permissionService.create,
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ["permissionGroups"] }),
	});

	// 5. Update an existing permission group record
	const updateMutation = useMutation({
		mutationFn: ({ id, data }) => permissionService.update(id, data),
		onSuccess: (data, variables) => {
			queryClient.invalidateQueries({ queryKey: ["permissionGroups"] });
			queryClient.invalidateQueries({ queryKey: ["permissionGroup", variables.id] });
		},
	});

	// --- Error Separation ---

	// Fetch errors: from initial data loading (shown via ErrorState component)
	const fetchError =
		permissionGroupsQuery.error ||
		permissionGroupDetailQuery.error;

	// Action errors: from mutations (shown via toast or inline message)
	const actionError =
		deleteMutation.error ||
		createMutation.error ||
		updateMutation.error;

	return {
		// Data
		permissionGroups: permissionGroupsQuery?.data ?? [],
		permissionGroupDetail: permissionGroupDetailQuery?.data,
		totalPages: permissionGroupsQuery?.data?.pagination?.totalPages ?? permissionGroupsQuery?.data?.totalPages ?? 0,
		currentPage: permissionGroupsQuery?.data?.pagination?.currentPage ?? permissionGroupsQuery?.data?.currentPage ?? 1,
		totalCount: permissionGroupsQuery?.data?.pagination?.totalCount ?? permissionGroupsQuery?.data?.totalCount ?? 0,

		// Status
		isPermissionGroupsLoading: permissionGroupsQuery.isLoading || permissionGroupDetailQuery.isLoading,
		isPermissionGroupsActionPending:
			createMutation.isPending ||
			updateMutation.isPending ||
			deleteMutation.isPending,

		// Fetch error → use with <ErrorState> component
		permissionGroupsFetchError: fetchError ? getErrorMessage(fetchError) : null,

		// Action error → use with toast or inline message
		permissionGroupsActionError: actionError ? getErrorMessage(actionError) : null,

		// Methods
		addPermissionGroup: createMutation.mutate,
		updatePermissionGroup: updateMutation.mutate,
		deletePermissionGroup: deleteMutation.mutate,
		refetch: permissionGroupsQuery.refetch,
	};
};