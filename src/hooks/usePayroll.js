import { useQuery, useQueries, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { payrollService } from "@/services/api/services/payrollService";
import { useHomes } from "@/hooks/useHomes";

const getErrorMessage = (err) =>
	err?.response?.data?.details?.[0]?.msg ||
	err?.response?.data?.error ||
	"An unexpected error occurred";

/**
 * Fetches the payroll cover-sheet for a single home (used on the detail page).
 * Returns the raw `coverSheet` object so callers can access any field
 * (e.g. coverSheet?.staff, coverSheet?.totals) without the hook pre-slicing.
 *
 * @param {Object} options
 * @param {Object}  options.params   - { homeId, payYear, periodNumber, detail? }
 * @param {boolean} options.enabled  - Gate the fetch (default: true)
 */
export const useCoverSheet = ({ params = {}, enabled = true } = {}) => {
	const coverSheetQuery = useQuery({
		queryKey: ["payroll", "coverSheet", params],
		queryFn: () => payrollService.getCoverSheet(params),
		enabled: !!(
			enabled &&
			params.homeId &&
			params.payYear &&
			params.periodNumber
		),
		placeholderData: keepPreviousData,
	});

	return {
		coverSheet: coverSheetQuery.data ?? null,
		isLoading:  coverSheetQuery.isLoading || coverSheetQuery.isFetching,
		fetchError: coverSheetQuery.error ? getErrorMessage(coverSheetQuery.error) : null,
		refetch:    coverSheetQuery.refetch,
	};
};

/**
 * Fetches payroll exceptions for a single home and pay period.
 * Used on both the detail page (banner) and the exceptions page (full list).
 *
 * @param {Object} options
 * @param {Object}  options.params   - { homeId, payYear, periodNumber }
 * @param {boolean} options.enabled
 */
export const usePayrollExceptions = ({ params = {}, enabled = true } = {}) => {
	const query = useQuery({
		queryKey: ["payroll", "exceptions", params],
		queryFn:  () => payrollService.getExceptions(params),
		enabled: !!(
			enabled &&
			params.homeId &&
			params.payYear &&
			params.periodNumber
		),
	});

	const responseData      = query.data ?? {};
	const unresolvedOverage = responseData.unresolvedOverage ?? [];
	const bankCapExceeded   = responseData.bankCapExceeded   ?? [];
	const negativeBalances  = responseData.negativeBalances  ?? [];
	const totalCount        = unresolvedOverage.length + bankCapExceeded.length + negativeBalances.length;

	return {
		unresolvedOverage,
		bankCapExceeded,
		negativeBalances,
		totalCount,
		isLoading:  query.isLoading || query.isFetching,
		fetchError: query.error ? getErrorMessage(query.error) : null,
		refetch:    query.refetch,
	};
};

/**
 * Fetches all homes + their payroll totals concurrently.
 * Used by the Payroll Overview page — returns display-ready rows so the
 * page component only needs to render, not orchestrate data fetching.
 *
 * @param {Object}        options
 * @param {string|number} options.payYear
 * @param {string|number} options.periodNumber
 * @param {boolean}       options.enabled  - Gate payroll fetches (default: true)
 */
export const usePayrollOverview = ({ payYear, periodNumber, enabled = true } = {}) => {
	// All homes — always fetched so the table populates immediately
	const {
		homes,
		isLoading: homesLoading,
		fetchError: homesError,
		refetch: refetchHomes,
	} = useHomes({ params: { limit: 100 } });

	const canFetch = !!(enabled && payYear && periodNumber && homes.length > 0);

	// One concurrent query per home
	const queries = useQueries({
		queries: canFetch
			? homes.map((home) => {
				const homeId = home.id;
				return {
					queryKey: ["payroll", "coverSheet", {
						homeId,
						payYear:      Number(payYear),
						periodNumber: Number(periodNumber),
					}],
					queryFn: () => payrollService.getCoverSheet({
						homeId,
						payYear:      Number(payYear),
						periodNumber: Number(periodNumber),
					}),
					enabled:         !!homeId,
					placeholderData: keepPreviousData,
				};
			})
			: [],
	});
	// Merge home metadata + payroll data into one display-ready array
	const rows = homes.map((home, i) => ({
		home,
		homeId:     home.id,
		totals:     queries[i]?.data?.totals ?? null,
		isLoading:  !!(queries[i]?.isLoading || queries[i]?.isFetching),
		fetchError: queries[i]?.error ? getErrorMessage(queries[i].error) : null,
	}));

	return {
		rows,
		homesLoading,
		homesError,
		refetchHomes,
		isAnyLoading: queries.some((q) => q.isLoading || q.isFetching),
	};
};

/**
 * Fetches the payroll summary for a single caregiver and pay period.
 * Used on the caregiver summary detail page.
 *
 * @param {Object} options
 * @param {Object}  options.params   - { caregiverId, payYear, periodNumber }
 * @param {boolean} options.enabled
 */
export const useCaregiverPayrollSummary = ({ params = {}, enabled = true } = {}) => {
	const query = useQuery({
		queryKey: ["payroll", "caregiverSummary", params],
		queryFn:  () => payrollService.getCaregiverSummary(params),
		enabled: !!(
			enabled &&
			params.caregiverId &&
			params.payYear &&
			params.periodNumber
		),
		placeholderData: keepPreviousData,
	});

	return {
		summary:    query.data   ?? null,
		isLoading:  query.isLoading,
		fetchError: query.error  ? getErrorMessage(query.error) : null,
		refetch:    query.refetch,
	};
};

/**
 * Mutation hook for creating a manual payroll entry for a caregiver.
 * Invalidates the caregiver summary query on success so the entries list refreshes.
 *
 * Requires manage_payroll permission — enforce in the calling component.
 *
 * @param {string} caregiverId - The caregiver's database ID.
 */
export const useCreateCaregiverEntry = (caregiverId) => {
	const queryClient = useQueryClient();

	const mutation = useMutation({
		mutationFn: (body) => payrollService.createEntry({ caregiverId, body }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["payroll", "caregiverSummary"] });
		},
	});

	return {
		createEntry:    mutation.mutateAsync,
		isCreating:     mutation.isPending,
		createResult:   mutation.data  ?? null,
		createError:    mutation.error ? getErrorMessage(mutation.error) : null,
		resetCreate:    mutation.reset,
	};
};

/**
 * Fetches a single manual payroll entry by its ID.
 * Used on the entry detail page.
 *
 * @param {string} entryId - The entry's database ID.
 */
export const useEntry = (entryId) => {
	const query = useQuery({
		queryKey: ["payroll", "entry", entryId],
		queryFn:  () => payrollService.getEntry(entryId),
		enabled:  !!entryId,
	});
	return {
		entry:      query.data   ?? null,
		isLoading:  query.isLoading || query.isFetching,
		fetchError: query.error  ? getErrorMessage(query.error) : null,
		refetch:    query.refetch,
	};
};

/**
 * Mutation hook for voiding a manual payroll entry.
 * Invalidates the entry query and the caregiver summary on success so
 * both the detail page and the summary list reflect the voided status.
 *
 * Requires manage_payroll permission — enforce in the calling component.
 *
 * @param {string} entryId - The entry's database ID.
 */
export const useVoidEntry = (entryId) => {
	const queryClient = useQueryClient();

	const mutation = useMutation({
		mutationFn: (body) => payrollService.voidEntry({ entryId, body }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["payroll", "entry", entryId] });
			queryClient.invalidateQueries({ queryKey: ["payroll", "caregiverSummary"] });
		},
	});

	return {
		voidEntry:  mutation.mutateAsync,
		isVoiding:  mutation.isPending,
		voidResult: mutation.data  ?? null,
		voidError:  mutation.error ? getErrorMessage(mutation.error) : null,
		resetVoid:  mutation.reset,
	};
};

/**
 * Mutation hook for forcing a payroll stat recompute for a pay period.
 * Automatically invalidates all coverSheet queries on success so every
 * home row in the overview refreshes with the recomputed data.
 *
 * Requires manage_payroll permission — enforce in the calling component.
 */
export const useRecomputeStats = () => {
	const queryClient = useQueryClient();

	const mutation = useMutation({
		mutationFn: (body) => payrollService.recomputeStats(body),
		onSuccess: () => {
			// Invalidate home-level rows so the overview table reflects recomputed values.
			queryClient.invalidateQueries({ queryKey: ["payroll", "coverSheet"] });
		},
	});

	return {
		recompute:      mutation.mutateAsync,
		isRecomputing:  mutation.isPending,
		recomputeResult: mutation.data  ?? null,
		recomputeError:  mutation.error ? getErrorMessage(mutation.error) : null,
		resetRecompute:  mutation.reset,
	};
};
