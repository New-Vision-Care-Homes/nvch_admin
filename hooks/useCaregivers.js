import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { caregiverService } from "@/api/services/caregiverService";

/**
 * Custom hook to manage all Caregiver operations: Read, Create, Update, and Delete (CRUD).
 * @param {string|number} caregiverId - Optional ID to fetch specific caregiver details
 */
export const useCaregivers = (options = {}) => {
	const queryClient = useQueryClient();

	// Support both old API (single clientId) and new API (options object)
	const caregiverId = typeof options === 'string' || typeof options === 'number' ? options : options.caregiverId;
	const params = typeof options === 'object' && !options.caregiverId ? options : options.params || {};

	/**
	 * Helper to extract the most relevant error message.
	 */
	const getErrorMessage = (err) => {
		return (
			err?.response?.data?.error || // Message from backend (e.g., "Email already exists")
			"An unexpected error occurred"  // Fallback string
		);
	};

	// 1. Fetch all clients for the list view (with optional search params)
	const caregiversQuery = useQuery({
		queryKey: ["caregivers", params],
		queryFn: () => caregiverService.getAll(params),
		enabled: !caregiverId, // Only fetch list if not fetching a specific client
	});

	// 2. Fetch a single client's details (only runs if clientId is provided)
	const caregiverDetailQuery = useQuery({
		queryKey: ["caregiver", caregiverId],
		queryFn: () => caregiverService.getCaregiver(caregiverId),
		enabled: !!caregiverId,
	});

	// 3. DELETE: Remove a caregiver
	const deleteMutation = useMutation({
		mutationFn: (id) => caregiverService.delete(id),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["caregivers"] });
		},
	});

	// 4. CREATE: Add a new caregiver
	const createMutation = useMutation({
		mutationFn: (newCaregiver) => caregiverService.create(newCaregiver),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["caregivers"] });
		},
	});

	// 5. UPDATE: Modify an existing caregiver
	const updateMutation = useMutation({
		mutationFn: ({ id, data }) => caregiverService.update(id, data),
		onSuccess: (data, variables) => {
			queryClient.invalidateQueries({ queryKey: ["caregivers"] });
			// If we had a detail query, we'd invalidate it too
			// queryClient.invalidateQueries({ queryKey: ["caregiver", variables.id] });
		},
	});

	// --- Error Separation ---

	// Fetch errors: from initial data loading (shown via ErrorState component)
	const fetchError =
		caregiversQuery.error ||
		caregiverDetailQuery.error;

	// Action errors: from mutations (shown via toast or inline message)
	const actionError =
		deleteMutation.error ||
		createMutation.error ||
		updateMutation.error;

	return {
		// Data
		caregivers: caregiversQuery.data ?? [],
		caregiverDetail: caregiverDetailQuery.data,

		totalPages: caregiversQuery.data?.pagination?.totalPages ?? caregiversQuery.data?.totalPages ?? 0,
		currentPage: caregiversQuery.data?.pagination?.currentPage ?? caregiversQuery.data?.currentPage ?? 1,
		totalCount: caregiversQuery.data?.pagination?.totalCount ?? caregiversQuery.data?.totalCount ?? 0,

		// Status Indicators
		isLoading: caregiversQuery.isLoading || caregiverDetailQuery.isLoading,
		isActionPending:
			createMutation.isPending ||
			updateMutation.isPending ||
			deleteMutation.isPending,

		// Fetch error → use with <ErrorState> component
		fetchError: fetchError ? getErrorMessage(fetchError) : null,

		// Action error → use with toast or inline message
		actionError: actionError ? getErrorMessage(actionError) : null,

		// Exposed Methods
		addCaregiver: createMutation.mutate,
		updateCaregiver: updateMutation.mutate,
		deleteCaregiver: deleteMutation.mutate,
		refetch: caregiversQuery.refetch,
	};
};