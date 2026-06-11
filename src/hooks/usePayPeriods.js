import { useQuery } from "@tanstack/react-query";
import { hourService } from "@/services/api/services/hourService";
import { shiftPayPeriodRef } from "@/utils/payPeriod";

/**
 * Resolve a pay period from the backend (GET /api/hours/pay-periods).
 *
 * `offset` selects the period relative to today's: 0 = current, -1 = one
 * period back, +1 = one ahead. Dates always come from the server — the
 * client only does the PP-number arithmetic needed to know WHICH period
 * to ask the relevant pay year for.
 *
 * Returns `payPeriod` as { payYear, periodNumber, globalIndex,
 * periodStart, periodEnd } (UTC ISO strings), or null while loading.
 */
export const usePayPeriod = (offset = 0) => {
	// Today's period, straight from the server.
	const currentQuery = useQuery({
		queryKey: ["payPeriods", "current"],
		queryFn: () => hourService.getPayPeriods(),
		staleTime: 5 * 60 * 1000,
	});

	const current = currentQuery.data;
	const target = current
		? shiftPayPeriodRef(current.payYear, current.periodNumber, offset)
		: null;

	// All 26 periods of the target pay year, cached per year. Period dates
	// never change, so a long staleTime avoids refetching on every nav click.
	const yearQuery = useQuery({
		queryKey: ["payPeriods", target?.payYear],
		queryFn: () => hourService.getPayPeriods({ payYear: target.payYear }),
		enabled: !!target,
		staleTime: 24 * 60 * 60 * 1000,
	});

	// While the year list loads, offset 0 can already be served from the
	// current-period response.
	const payPeriod =
		yearQuery.data?.periods?.[target ? target.periodNumber - 1 : -1] ??
		(offset === 0 ? current : null) ??
		null;

	const error = currentQuery.error || yearQuery.error || null;
	const payPeriodError = error
		? error?.response?.data?.error || "Failed to load pay-period dates"
		: null;

	return {
		payPeriod,
		isPayPeriodLoading: currentQuery.isLoading || yearQuery.isLoading,
		payPeriodError,
	};
};
