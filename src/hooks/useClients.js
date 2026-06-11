import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
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
	 *
	 * Priority:
	 * 1. Statutory Decision Maker special case — the backend sends a nested details
	 *    entry when SDM is missing both phone and email, so we surface a clear message.
	 * 2. First express-validator field error (details[0].msg) — catches most backend
	 *    validation failures with a specific, field-level message.
	 * 3. Top-level error string — the standard { success: false, error: "..." } shape.
	 * 4. Generic fallback.
	 */
	const getErrorMessage = (err) => {
		const data = err?.response?.data;

		const sdmDetail = Array.isArray(data?.details) && data.details.find((d) => d.path === "statutoryDecisionMaker");
		if (sdmDetail) {
			return "Statutory Decision Maker requires at least a phone number or email address";
		}

		return (
			data?.details?.[0]?.msg ||
			data?.error ||
			"An unexpected error occurred"
		);
	};

	// --- Queries ---

	// 1. Fetch all clients for the list view
	const clientsQuery = useQuery({
		queryKey: ["clients", params],
		queryFn: () => clientService.getAll(params),
		enabled: !clientId,
		placeholderData: keepPreviousData, // Keep showing old results while fetching new ones (prevents flash)
	});

	// 2. Fetch a single client's details
	const clientDetailQuery = useQuery({
		queryKey: ["client", clientId],
		queryFn: () => clientService.getClient(clientId),
		enabled: !!clientId,
	});

	// Imperative fetch for a single client — uses the React Query cache so
	// repeated calls for the same ID are free within the stale window.
	const fetchClient = (id) =>
		queryClient.fetchQuery({
			queryKey: ["client", id],
			queryFn: () => clientService.getClient(id),
			staleTime: 30_000,
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

	// 6. TOGGLE STATUS: Toggle an client's active status
	const toggleStatusMutation = useMutation({
		mutationFn: (id) => clientService.toggleStatus(id),
		onSuccess: (data, variables) => {
			queryClient.invalidateQueries({ queryKey: ["clients"] });
			// Option to invalidate specific client query:
			queryClient.invalidateQueries({ queryKey: ["client", variables] });
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
		updateMutation.error ||
		toggleStatusMutation.error;

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
			deleteMutation.isPending ||
			toggleStatusMutation.isPending,

		// Fetch error → use with <ErrorState> component
		fetchError: fetchError ? getErrorMessage(fetchError) : null,

		// Action error → use with toast or inline message
		actionError: actionError ? getErrorMessage(actionError) : null,

		// Methods
		addClient: createMutation.mutate,
		updateClient: updateMutation.mutate,
		deleteClient: deleteMutation.mutate,
		toggleClientStatus: toggleStatusMutation.mutate,
		fetchClient,
		refetch: clientsQuery.refetch,
	};
};