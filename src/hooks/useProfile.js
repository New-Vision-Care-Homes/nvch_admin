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
			err?.response?.data?.details?.[0]?.msg ||
			err?.response?.data?.message ||
			err?.response?.data?.error ||
			err?.message ||
			"An unexpected error occurred"
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

	const changePasswordMutation = useMutation({
		mutationFn: (data) => authService.changePassword(data),
	});

	return {
		// Data
		profile: profileQuery.data ?? null,
		updateProfile: updateMutation.mutate,
		changePassword: changePasswordMutation.mutate,

		// Status Indicators
		isLoading: profileQuery.isLoading,
		isActionPending: updateMutation.isPending,
		isChangePasswordPending: changePasswordMutation.isPending,

		// Fetch error → use with <ErrorState> component
		fetchError: profileQuery.error ? getErrorMessage(profileQuery.error) : null,

		// Action error → use with toast or inline message
		actionError: updateMutation.error ? getErrorMessage(updateMutation.error) : null,
		changePasswordError: changePasswordMutation.error ? getErrorMessage(changePasswordMutation.error) : null,

		refetch: profileQuery.refetch,
	};
};