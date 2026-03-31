import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { homeService } from "@/services/api/services/homeService";

/**
 * Custom hook to manage Home (Housing Unit) operations.
 * @param {Object|string|number} arg - Query parameters for fetching homes OR homeId for fetching a single home
 */
export const useHomes = (arg = null) => {
	const queryClient = useQueryClient();

	const isId = typeof arg === "string" || typeof arg === "number";
	const homeId = isId ? arg : null;
	const params = !isId && typeof arg === "object" ? arg : {};

	/**
	 * Helper to extract error message
	 */
	const getErrorMessage = (err) => {
		return (
			err?.response?.data?.error || // Message from backend (e.g., "Email already exists")
			"An unexpected error occurred"  // Fallback string
		);
	};

	// 1. Fetch homes (list)
	const homesQuery = useQuery({
		queryKey: ["homes", params],
		queryFn: () => homeService.getAll(params),
		enabled: !homeId, // Only run if not looking for a single home detail
		keepPreviousData: true,
	});

	// 2. Fetch single home (detail)
	const homeDetailQuery = useQuery({
		queryKey: ["home", homeId],
		queryFn: () => homeService.getHome(homeId),
		enabled: !!homeId,
	});

	const homes = homesQuery.data?.homes ?? [];
	const pagination = homesQuery.data?.pagination ?? {};
	const homeDetail = homeDetailQuery.data?.home ?? homeDetailQuery.data;

	// 3. Mutations
	const createMutation = useMutation({
		mutationFn: homeService.create,
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ["homes"] }),
	});

	const updateMutation = useMutation({
		mutationFn: ({ id, data }) => homeService.update(id, data),
		onSuccess: (data, variables) => {
			queryClient.invalidateQueries({ queryKey: ["homes"] });
			if (variables.id) {
				queryClient.invalidateQueries({ queryKey: ["home", variables.id] });
			}
		},
	});

	const deleteMutation = useMutation({
		mutationFn: homeService.delete,
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ["homes"] }),
	});

	// --- Error Separation ---

	// Fetch errors: from initial data loading (shown via ErrorState component)
	const fetchError =
		homesQuery.error ||
		homeDetailQuery.error;

	// Action errors: from mutations (shown via toast or inline message)
	const actionError =
		deleteMutation.error ||
		createMutation.error ||
		updateMutation.error;

	return {
		// Data outputs
		homes,
		pagination,
		homeDetail,

		// Status indicators
		isLoading: homesQuery.isLoading || homeDetailQuery.isLoading,

		// Fetch error → use with <ErrorState> component
		fetchError: fetchError ? getErrorMessage(fetchError) : null,

		// Action error → use with toast or inline message
		actionError: actionError ? getErrorMessage(actionError) : null,

		// Actions
		addHome: createMutation.mutateAsync,
		updateHome: updateMutation.mutateAsync,
		deleteHome: deleteMutation.mutateAsync,

		isActionPending: createMutation.isPending || updateMutation.isPending || deleteMutation.isPending,
		refetch: homesQuery.refetch
	};
};
