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
			err?.response?.data?.message ||
			err?.message ||
			"An unexpected error occurred"
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

	const activeError =
		caregiversQuery.error ||
		deleteMutation.error ||
		createMutation.error ||
		updateMutation.error;

	return {
		// Data
		caregivers: caregiversQuery.data ?? [],
		caregiverDetail: caregiverDetailQuery.data,

		// Status Indicators
		isLoading: caregiversQuery.isLoading || caregiverDetailQuery.isLoading,
		isActionPending:
			createMutation.isPending ||
			updateMutation.isPending ||
			deleteMutation.isPending,

		// Error Handling
		isError: !!activeError,
		errorMessage: activeError ? getErrorMessage(activeError) : null,

		// Exposed Methods
		addCaregiver: createMutation.mutate,
		updateCaregiver: updateMutation.mutate,
		deleteCaregiver: deleteMutation.mutate,
	};
};