import { useQuery } from "@tanstack/react-query";
import { authService } from "@/api/services/authService";

/**
 * Custom hook to fetch the current logged-in user's profile.
 */
export const useProfile = () => {

	/**
	 * Helper to extract the most relevant error message.
	 */
	const getErrorMessage = (err) => {
		return (
			err?.response?.data?.error || // Message from backend (e.g., "Email already exists")
			"An unexpected error occurred"  // Fallback string
		);
	};

	// Fetch the current user's profile
	const profileQuery = useQuery({
		queryKey: ["profile"],
		queryFn: () => authService.getProfile(),
	});

	return {
		// Data
		profile: profileQuery.data ?? null,

		// Status Indicators
		isLoading: profileQuery.isLoading,

		// Error Handling
		errorMessage: profileQuery.error ? getErrorMessage(profileQuery.error) : null,
	};
};