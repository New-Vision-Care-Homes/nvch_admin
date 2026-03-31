import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { clientService } from "@/services/api/services/clientService";

/**
 * Custom hook to manage all Client operations (CRUD).
 *
 * @param {Object} options
 * @param {string|number} options.clientId - Optional ID to fetch specific client details
 * @param {Object} options.params - Optional query parameters for the list (search, limit, page)
 */
export const useClients = (options = {}) => {
	const queryClient = useQueryClient();

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
	 * Extracts the most relevant error message from an Axios error object.
	 */
	const getErrorMessage = (err) => {
		return (
			err?.response?.data?.error ||
			"An unexpected error occurred"
		);
	};

	// --- Queries ---

	// 1. Fetch all clients for the list view
	const clientsQuery = useQuery({
		queryKey: ["clients", params],
		queryFn: () => clientService.getAll(params),
		enabled: !clientId,
	});

	// 2. Fetch a single client's details
	const clientDetailQuery = useQuery({
		queryKey: ["client", clientId],
		queryFn: () => clientService.getClient(clientId),
		enabled: !!clientId,
	});

	// --- Mutations ---

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

	// 5. Update an existing client record
	const updateMutation = useMutation({
		mutationFn: ({ id, data }) => clientService.update(id, data),
		onSuccess: (data, variables) => {
			queryClient.invalidateQueries({ queryKey: ["clients"] });
			queryClient.invalidateQueries({ queryKey: ["client", variables.id] });
		},
	});

	// --- Error Separation ---

	// Fetch errors: from initial data loading (shown via ErrorState component)
	const fetchError =
		clientsQuery.error ||
		clientDetailQuery.error;

	// Action errors: from mutations (shown via toast or inline message)
	const actionError =
		deleteMutation.error ||
		createMutation.error ||
		updateMutation.error;

	return {
		// Data
		clients: clientsQuery.data?.clients ?? [],
		clientDetail: clientDetailQuery.data,
		totalPages: clientsQuery.data?.pagination?.totalPages ?? clientsQuery.data?.totalPages ?? 0,
		currentPage: clientsQuery.data?.pagination?.currentPage ?? clientsQuery.data?.currentPage ?? 1,
		totalCount: clientsQuery.data?.pagination?.totalCount ?? clientsQuery.data?.totalCount ?? 0,

		// Status
		isLoading: clientsQuery.isLoading || clientDetailQuery.isLoading,
		isActionPending:
			createMutation.isPending ||
			updateMutation.isPending ||
			deleteMutation.isPending,

		// Fetch error → use with <ErrorState> component
		fetchError: fetchError ? getErrorMessage(fetchError) : null,

		// Action error → use with toast or inline message
		actionError: actionError ? getErrorMessage(actionError) : null,

		// Methods
		addClient: createMutation.mutate,
		updateClient: updateMutation.mutate,
		deleteClient: deleteMutation.mutate,
		refetch: clientsQuery.refetch,
	};
};