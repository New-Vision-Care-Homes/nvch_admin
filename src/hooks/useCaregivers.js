import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { caregiverService } from "@/services/api/services/caregiverService";

/**
 * Custom hook to manage all Caregiver operations: Read, Create, Update, and Delete (CRUD).
 * @param {string|number} caregiverId - Optional ID to fetch specific caregiver details
 */
export const useCaregivers = (options = {}) => {
	const queryClient = useQueryClient();

	// Support both old API (single caregiverId) and new API (options object).
	// String/number argument = detail mode: only the single-caregiver query may
	// run. An empty-string id must NOT fall through to the list query — callers
	// pass "" for "no caregiver selected" and don't expect a fetch of everyone.
	const isDetailMode = typeof options === 'string' || typeof options === 'number';
	const caregiverId = isDetailMode ? options : options.caregiverId;
	const enabled = isDetailMode ? true : options.enabled !== false;
	let params = {};
	if (!isDetailMode) {
		if (options.params) {
			params = options.params;
		} else if (!options.caregiverId) {
			// `enabled` is hook config, not a backend filter — keep it out of the
			// query params (and therefore out of the query key / URL).
			const { enabled: _enabled, ...rest } = options;
			params = rest;
		}
	}

	/**
	 * Extracts the most relevant error message from an Axios error object.
	 *
	 * Priority:
	 * 1. First express-validator field error (details[0].msg) — specific backend
	 *    validation message, e.g. "Email is already in use".
	 * 2. Top-level error string — standard { success: false, error: "..." } shape.
	 * 3. Generic fallback.
	 */
	const getErrorMessage = (err) => {
		return (
			err?.response?.data?.details?.[0]?.msg ||
			err?.response?.data?.error ||
			"An unexpected error occurred"
		);
	};

	// 1. Fetch all clients for the list view (with optional search params)
	const caregiversQuery = useQuery({
		queryKey: ["caregivers", params],
		queryFn: () => caregiverService.getAll(params),
		enabled: enabled && !isDetailMode && !caregiverId,
		placeholderData: keepPreviousData, // Keep showing old results while fetching new ones (prevents flash)
	});

	// 2. Fetch a single client's details (only runs if clientId is provided)
	const caregiverDetailQuery = useQuery({
		queryKey: ["caregiver", caregiverId],
		queryFn: () => caregiverService.getCaregiver(caregiverId),
		enabled: enabled && !!caregiverId,
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
			queryClient.invalidateQueries({ queryKey: ["caregiver", variables.id] });
		},
	});

	// 6. TOGGLE STATUS: Toggle an caregiver's active status
	const toggleStatusMutation = useMutation({
		mutationFn: (id) => caregiverService.toggleStatus(id),
		onSuccess: (data, variables) => {
			queryClient.invalidateQueries({ queryKey: ["caregivers"] });
			// Option to invalidate specific admin query:
			queryClient.invalidateQueries({ queryKey: ["caregiver", variables] });
		},
	});

	// --- Error Separation ---

	// Fetch errors: from initial data loading (shown via ErrorState component)
	const fetchError =
		caregiversQuery.error ||
		caregiverDetailQuery.error;

	// Action errors: from mutations (shown via toast or inline message)
	const actionError =
		deleteMutation.error ||
		createMutation.error ||
		updateMutation.error ||
		toggleStatusMutation.error;

	return {
		// Data
		caregivers: caregiversQuery.data?.caregivers ?? caregiversQuery.data ?? [],
		caregiverDetail: caregiverDetailQuery.data,

		totalPages: caregiversQuery.data?.pagination?.totalPages ?? caregiversQuery.data?.totalPages ?? 0,
		currentPage: caregiversQuery.data?.pagination?.currentPage ?? caregiversQuery.data?.currentPage ?? 1,
		totalCount: caregiversQuery.data?.pagination?.totalCount ?? caregiversQuery.data?.totalCount ?? 0,

		// Status Indicators
		isCaregiverLoading: caregiversQuery.isLoading || caregiverDetailQuery.isLoading,
		isCaregiverActionPending:
			createMutation.isPending ||
			updateMutation.isPending ||
			deleteMutation.isPending ||
			toggleStatusMutation.isPending,

		// Fetch error → use with <ErrorState> component
		caregiverFetchError: fetchError ? getErrorMessage(fetchError) : null,

		// Action error → use with toast or inline message
		caregiverActionError: actionError ? getErrorMessage(actionError) : null,

		// Exposed Methods
		addCaregiver: createMutation.mutate,
		updateCaregiver: updateMutation.mutate,
		deleteCaregiver: deleteMutation.mutate,
		toggleCaregiverStatus: toggleStatusMutation.mutate,
		refetch: caregiversQuery.refetch,
	};
};