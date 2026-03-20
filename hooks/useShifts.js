import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { shiftService } from "@/api/services/shiftService";

/**
 * Custom hook to manage all Shift operations (CRUD).
 * 
 * @param {Object} options
 * @param {string|number} options.shiftId - Optional ID to fetch specific shift details
 * @param {Object} options.params - Optional query parameters for the list (search, limit, page)
 */
export const useShifts = (options = {}) => {
	const queryClient = useQueryClient();

	// Support both old API (single shiftId) and new API (options object)
	const shiftId = typeof options === 'string' || typeof options === 'number' ? options : options.shiftId;
	let params = {};
	if (typeof options === 'object') {
		if (options.params) {
			params = options.params;
		} else if (!options.shiftId) {
			params = options;
		}
	}

	/**
	 * Helper to extract the most relevant error message.
	 */
	const getErrorMessage = (err) => {
		return (
			err?.response?.data?.message || // Message from backend
			err?.message ||                 // Generic Axios/Network error
			"An unexpected error occurred"
		);
	};

	// --- Queries: Data Fetching ---

	// 1. Fetch all shifts for the list view (uses params)
	const shiftsQuery = useQuery({
		queryKey: ["shifts", params],
		queryFn: () => shiftService.getAll(params),
		// Only run if we are NOT looking for a specific single shift detail
		enabled: !shiftId,
	});

	// 2. Fetch a single shift's details (only runs if shiftId is provided)
	const shiftDetailQuery = useQuery({
		queryKey: ["shift", shiftId],
		queryFn: () => shiftService.getShift(shiftId),
		enabled: !!shiftId,
	});

	// --- Mutations: Data Actions ---

	// 3. Delete a shift record
	const deleteMutation = useMutation({
		mutationFn: shiftService.delete,
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ["shifts"] }),
	});

	// 4. Create a new shift record
	const createMutation = useMutation({
		mutationFn: shiftService.create,
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ["shifts"] }),
	});

	// 5. Update an existing shift's record
	const updateMutation = useMutation({
		mutationFn: ({ id, data }) => shiftService.update(id, data),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ["shifts"] }),
	});

	// --- State Consolidation ---

	const activeError =
		shiftsQuery.error ||
		shiftDetailQuery.error ||
		deleteMutation.error ||
		createMutation.error ||
		updateMutation.error;

	return {
		// Data Outputs
		shifts: shiftsQuery.data ?? [],
		shiftDetail: shiftDetailQuery.data,

		// Status Indicators
		isLoading: shiftsQuery.isLoading || shiftDetailQuery.isLoading,
		isActionPending:
			createMutation.isPending ||
			updateMutation.isPending ||
			deleteMutation.isPending,

		// Error Handling
		isError: !!activeError,
		errorMessage: activeError ? getErrorMessage(activeError) : null,

		// Exposed Methods
		addShift: createMutation.mutateAsync,
		updateShift: updateMutation.mutateAsync,
		deleteShift: deleteMutation.mutateAsync,
	};
};