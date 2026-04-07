import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminService } from "@/services/api/services/adminService";

/**
 * Custom hook to manage all Admin operations: Read, Create, Update, and Delete (CRUD).
 * @param {string|number} adminId - Optional ID to fetch specific admin details
 */
export const useAdmins = (options = {}) => {
	const queryClient = useQueryClient();

	const adminId = typeof options === 'string' || typeof options === 'number' ? options : options.adminId;
	let params = {};
	if (typeof options === 'object') {
		if (options.params) {
			params = options.params;
		} else if (!options.adminId) {
			params = options;
		}
	}

	/**
	 * Helper to extract the most relevant error message.
	 */
	const getErrorMessage = (err) => {
		return (
			err?.response?.data?.error || // Message from backend (e.g., "Email already exists")
			"An unexpected error occurred"  // Fallback string
		);
	};

	// 1. Fetch all admins for the list view (with optional search params)
	const adminsQuery = useQuery({
		queryKey: ["admins", params],
		queryFn: () => adminService.getAll(params),
		enabled: !adminId, // Fetch list if not fetching a specific admin
	});

	// 2. Fetch a single admin's details (only runs if adminId is provided)
	const adminDetailQuery = useQuery({
		queryKey: ["admin", adminId],
		queryFn: () => adminService.getAdmin(adminId),
		enabled: !!adminId,
	});

	// 3. DELETE: Remove an admin
	const deleteMutation = useMutation({
		mutationFn: (id) => adminService.delete(id),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["admins"] });
		},
	});

	// 4. CREATE: Add a new admin
	const createMutation = useMutation({
		mutationFn: (newAdmin) => adminService.create(newAdmin),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["admins"] });
		},
	});

	// 5. UPDATE: Modify an existing admin
	const updateMutation = useMutation({
		mutationFn: ({ id, data }) => adminService.update(id, data),
		onSuccess: (data, variables) => {
			queryClient.invalidateQueries({ queryKey: ["admins"] });
			// Option to invalidate specific admin query:
			// queryClient.invalidateQueries({ queryKey: ["admin", variables.id] });
		},
	});

	// --- Error Separation ---

	// Fetch errors: from initial data loading (shown via ErrorState component)
	const fetchError =
		adminsQuery.error ||
		adminDetailQuery.error;

	// Action errors: from mutations (shown via toast or inline message)
	const actionError =
		deleteMutation.error ||
		createMutation.error ||
		updateMutation.error;

	return {
		// Data
		admins: adminsQuery.data?.admins ?? adminsQuery.data ?? [],
		adminDetail: adminDetailQuery.data,

		totalPages: adminsQuery.data?.pagination?.totalPages ?? adminsQuery.data?.totalPages ?? 0,
		currentPage: adminsQuery.data?.pagination?.currentPage ?? adminsQuery.data?.currentPage ?? 1,
		totalCount: adminsQuery.data?.pagination?.totalCount ?? adminsQuery.data?.totalCount ?? 0,

		// Status Indicators
		isLoading: adminsQuery.isLoading || adminDetailQuery.isLoading,
		isActionPending:
			createMutation.isPending ||
			updateMutation.isPending ||
			deleteMutation.isPending,

		// Fetch error → use with <ErrorState> component
		fetchError: fetchError ? getErrorMessage(fetchError) : null,

		// Action error → use with toast or inline message
		actionError: actionError ? getErrorMessage(actionError) : null,

		// Exposed Methods
		addAdmin: createMutation.mutate,
		updateAdmin: updateMutation.mutate,
		deleteAdmin: deleteMutation.mutate,
		refetch: adminsQuery.refetch,
	};
};
