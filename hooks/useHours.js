import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { hourService } from "@/api/services/hourService";

/**
 * Custom hook to manage all Client operations (CRUD).
 *
 * @param {Object} options
 * @param {string|number} options.clientId - Optional ID to fetch specific client details
 * @param {Object} options.params - Optional query parameters for the list (search, limit, page)
 */
export const useHours = (caregiverId) => {

	const caregiverHourQuery = useQuery({
		queryKey: ["hours", caregiverId],
		queryFn: () => hourService.getCaregiverHours(caregiverId),
		enabled: !!caregiverId,
	});

	const caregiverHourHistoryQuery = useQuery({
		queryKey: ["hours", caregiverId, "history"],
		queryFn: () => hourService.getCaregiverHourHistory(caregiverId),
		enabled: !!caregiverId,
	});

	return {
		// Data
		hours: caregiverHourQuery.data,
		hourHistory: caregiverHourHistoryQuery.data,

		// Status
		isLoading: caregiverHourQuery.isLoading || caregiverHourHistoryQuery.isLoading,
		error: caregiverHourQuery.error || caregiverHourHistoryQuery.error,
		refetch: caregiverHourQuery.refetch,
		refetchHistory: caregiverHourHistoryQuery.refetch,
	};
};