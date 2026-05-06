import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { shiftService } from "@/services/api/services/shiftService";

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
			err?.response?.data?.error || // Message from backend (e.g., "Email already exists")
			"An unexpected error occurred"  // Fallback string
		);
	};

	// --- Queries: Data Fetching ---

	// 1. Fetch all shifts for the list view (uses params)
	const shiftsQuery = useQuery({
		queryKey: ["shifts", params],
		queryFn: () => shiftService.getAll(params),
		// Only run if we are NOT looking for a specific single shift detail
		enabled: !shiftId,
		placeholderData: keepPreviousData,
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
	const updateUpcommingShift = useMutation({
		mutationFn: ({ id, data }) => shiftService.updateUpcommingShift(id, data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["shift", shiftId] });
			queryClient.invalidateQueries({ queryKey: ["shifts"] });
		}
	});

	const updateCompletedShift = useMutation({
		mutationFn: ({ id, data }) => shiftService.updateCompletedShift(id, data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["shift", shiftId] });
			queryClient.invalidateQueries({ queryKey: ["shifts"] });
		},
	});

	// Fetch errors: from initial data loading (shown via ErrorState component)
	const fetchError =
		shiftsQuery.error ||
		shiftDetailQuery.error;

	// Action errors: from mutations (shown via toast or inline message)
	const actionError =
		deleteMutation.error ||
		createMutation.error ||
		updateUpcommingShift.error ||
		updateCompletedShift.error;


	return {
		// Data Outputs
		shifts: shiftsQuery.data?.shifts ?? [],
		shiftDetail: shiftDetailQuery.data,

		totalPages: shiftsQuery.data?.pagination?.totalPages ?? shiftsQuery.data?.totalPages ?? 0,
		currentPage: shiftsQuery.data?.pagination?.currentPage ?? shiftsQuery.data?.currentPage ?? 1,
		totalCount: shiftsQuery.data?.pagination?.totalCount ?? shiftsQuery.data?.totalCount ?? 0,

		// Status Indicators
		isShiftLoading: shiftsQuery.isLoading || shiftDetailQuery.isLoading,
		isShiftActionPending:
			createMutation.isPending ||
			updateUpcommingShift.isPending ||
			updateCompletedShift.isPending ||
			deleteMutation.isPending,

		// Fetch error → use with <ErrorState> component
		fetchShiftError: fetchError ? getErrorMessage(fetchError) : null,

		// Action error → use with toast or inline message
		actionShiftError: actionError ? getErrorMessage(actionError) : null,

		// Exposed Methods
		addShift: createMutation.mutateAsync,
		updateUpcommingShift: updateUpcommingShift.mutateAsync,
		updateCompletedShift: updateCompletedShift.mutateAsync,
		deleteShift: deleteMutation.mutateAsync,
		refetch: shiftsQuery.refetch,
	};
};