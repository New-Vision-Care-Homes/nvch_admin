import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminService } from "@/api/services/adminService";

/**
 * Custom hook to manage all Admin operations: Read, Create, Update, and Delete (CRUD).
 * @param {string|number} adminId - Optional ID to fetch specific admin details
 */
export const useAdmins = (options = {}) => {
	const queryClient = useQueryClient();

	const adminId = typeof options === 'string' || typeof options === 'number' ? options : options.adminId;
	const params = typeof options === 'object' && !options.adminId ? options : options.params || {};

	/**
	 * Helper to extract the most relevant error message.
	 */
	const getErrorMessage = (err) => {
		return (
			err?.response?.data?.message ||
			err?.message ||
			"An unexpected error occurred"
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

	const activeError =
		adminsQuery.error ||
		deleteMutation.error ||
		createMutation.error ||
		updateMutation.error ||
		adminDetailQuery.error;

	return {
		// Data
		admins: adminsQuery.data ?? [],
		adminDetail: adminDetailQuery.data,

		// Status Indicators
		isLoading: adminsQuery.isLoading || adminDetailQuery.isLoading,
		isActionPending:
			createMutation.isPending ||
			updateMutation.isPending ||
			deleteMutation.isPending,

		// Error Handling
		isError: !!activeError,
		errorMessage: activeError ? getErrorMessage(activeError) : null,

		// Exposed Methods
		addAdmin: createMutation.mutate,
		updateAdmin: updateMutation.mutate,
		deleteAdmin: deleteMutation.mutate,
	};
};
