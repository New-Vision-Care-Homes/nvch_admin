import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { clientService } from "@/api/services/clientService";

/**
 * Custom hook to manage all Client operations (CRUD).
 * 
 * @param {Object} options
 * @param {string|number} options.clientId - Optional ID to fetch specific client details
 * @param {Object} options.params - Optional query parameters for the list (search, limit, page)
 */

export const useClients = (options = {}) => {
	const queryClient = useQueryClient();

	// Support both old API (single clientId) and new API (options object)
	const clientId = typeof options === 'string' || typeof options === 'number' ? options : options.clientId;
	let params = {};
	if (typeof options === 'object') {
		if (options.params) {
			params = options.params;
		} else if (!options.clientId) {
			params = options;
		}
	}

	/**
	 * Helper to extract the most relevant error message from an Axios error object.
	 * It prioritizes the specific message sent by your backend API.
	 */
	const getErrorMessage = (err) => {
		return (
			err?.response?.data?.message || // Message from backend (e.g., "Email already exists")
			err?.message ||                 // Generic Axios/Network error (e.g., "Network Error")
			"An unexpected error occurred"  // Fallback string
		);
	};

	// --- Queries: Data Fetching ---

	// 1. Fetch all clients for the list view (with optional search params)
	const clientsQuery = useQuery({
		queryKey: ["clients", params],
		queryFn: () => clientService.getAll(params),
		enabled: !clientId, // Only fetch list if not fetching a specific client
	});

	// 2. Fetch a single client's details (only runs if clientId is provided)
	const clientDetailQuery = useQuery({
		queryKey: ["client", clientId],
		queryFn: () => clientService.getClient(clientId),
		enabled: !!clientId,
	});

	// --- Mutations: Data Actions ---

	// 3. Delete a client record
	const deleteMutation = useMutation({
		mutationFn: clientService.delete,
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ["clients"] }),
	});

	// 4. Create a new client record
	const createMutation = useMutation({
		mutationFn: clientService.create,
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ["clients"] }),
	});

	// 5. Update an existing client's record
	const updateMutation = useMutation({
		mutationFn: ({ id, data }) => clientService.update(id, data),
		onSuccess: (data, variables) => {
			// Refresh both the general list and the specific detail view
			queryClient.invalidateQueries({ queryKey: ["clients"] });
			queryClient.invalidateQueries({ queryKey: ["client", variables.id] });
		},
	});

	// --- State Consolidation ---

	/**
	 * activeError: Captures the first available error from any of the operations above.
	 * This allows the UI to display a single, relevant error message.
	 */
	const activeError =
		clientsQuery.error ||
		clientDetailQuery.error ||
		deleteMutation.error ||
		createMutation.error ||
		updateMutation.error;

	return {
		// Data Outputs
		clients: clientsQuery.data?.clients ?? [],
		totalPages: clientsQuery.data?.pagination?.totalPages ?? clientsQuery.data?.totalPages ?? 0,
		currentPage: clientsQuery.data?.pagination?.currentPage ?? clientsQuery.data?.currentPage ?? 1,
		totalCount: clientsQuery.data?.pagination?.totalCount ?? clientsQuery.data?.totalCount ?? 0,
		clientDetail: clientDetailQuery.data,

		// Status Indicators
		isLoading: clientsQuery.isLoading || clientDetailQuery.isLoading,
		isActionPending:
			createMutation.isPending ||
			updateMutation.isPending ||
			deleteMutation.isPending,

		// Error Handling
		isError: !!activeError,
		errorMessage: activeError ? getErrorMessage(activeError) : null,

		// Exposed Methods
		addClient: createMutation.mutate,
		updateClient: updateMutation.mutate,
		deleteClient: deleteMutation.mutate,
	};
};