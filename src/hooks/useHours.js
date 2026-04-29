import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { hourService } from "@/services/api/services/hourService";

/**
 * Custom hook to manage all Client operations (CRUD).
 *
 * @param {Object} options
 * @param {string|number} options.clientId - Optional ID to fetch specific client details
 * @param {Object} options.params - Optional query parameters for the list (search, limit, page)
 */
export const useHours = (caregiverId, params = {}) => {
	const queryClient = useQueryClient();

	/**
	 * Helper to extract the most relevant error message.
	 */
	const getErrorMessage = (err) => {
		return (
			err?.response?.data?.error || // Message from backend (e.g., "Email already exists")
			"An unexpected error occurred"  // Fallback string
		);
	};

	const caregiverHourQuery = useQuery({
		queryKey: ["hours", caregiverId],
		queryFn: () => hourService.getCaregiverHourHistory(caregiverId),
		enabled: !!caregiverId,
	});


	const updateCompletedHourMutation = useMutation({
		mutationFn: ({ id, updateData }) => hourService.updateCompletedHour(id, updateData),
		onSuccess: () => {
			queryClient.invalidateQueries(["hours", caregiverId]);
			queryClient.invalidateQueries(["hours", caregiverId, "history"]);
		},
	});

	// --- Error Separation ---

	// Fetch errors: from initial data loading (shown via ErrorState component)
	const fetchError = caregiverHourQuery.error

	// Action errors: from mutations (shown via toast or inline message)
	const actionError = updateCompletedHourMutation.error;

	return {
		// Data
		hours: caregiverHourQuery.data,
		updateCompletedHour: updateCompletedHourMutation.mutateAsync,

		isHoursLoading: caregiverHourQuery.isLoading,
		// Fetch error → use with <ErrorState> component
		hourFetchError: fetchError ? getErrorMessage(fetchError) : null,
		// Action error → use with toast or inline message
		hourActionError: actionError ? getErrorMessage(actionError) : null,

		refetch: caregiverHourQuery.refetch,
	};
};