import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authService } from "@/services/api/services/authService";

/**
 * Custom hook to fetch the current logged-in user's profile.
 */
export const useProfile = () => {
	const queryClient = useQueryClient();

	/**
	 * Helper to extract the most relevant error message.
	 */
	const getErrorMessage = (err) => {
		return (
			err?.response?.data?.details || // Message from backend (e.g., "Email already exists")
			"An unexpected error occurred"  // Fallback string
		);
	};

	// Fetch the current user's profile
	const profileQuery = useQuery({
		queryKey: ["profile"],
		queryFn: () => authService.getProfile(),
	});

	const updateMutation = useMutation({
		mutationFn: (data) => authService.updateProfile(data),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ["profile"] }),
	});

	return {
		// Data
		profile: profileQuery.data ?? null,
		updateProfile: updateMutation.mutate,

		// Status Indicators
		isLoading: profileQuery.isLoading,
		isActionPending: updateMutation.isPending,

		// Fetch error → use with <ErrorState> component
		fetchError: profileQuery.error ? getErrorMessage(profileQuery.error) : null,

		// Action error → use with toast or inline message
		actionError: updateMutation.error ? getErrorMessage(updateMutation.error) : null,

		refetch: profileQuery.refetch,
	};
};