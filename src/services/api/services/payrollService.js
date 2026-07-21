import axiosClient from '../axiosClient';
import { API_ENDPOINTS } from '../endpoints';

/**
 * Service for all Payroll-related API requests.
 * Base path: /api/payroll
 */
export const payrollService = {
	/**
	 * Fetch the payroll cover sheet for a given home and pay period.
	 * Append detail="daily" for the 14-day daily breakdown.
	 *
	 * @param {Object} params
	 * @param {string}  params.homeId        - Home's _id
	 * @param {number}  params.payYear       - e.g. 2026
	 * @param {number}  params.periodNumber  - 1–26
	 * @param {string}  [params.detail]      - "daily" for day-by-day breakdown
	 * @returns {Promise<{ staff: Array }>}
	 */
	getCoverSheet: async (params = {}) => {
		const { data } = await axiosClient.get(API_ENDPOINTS.PAYROLL.COVER_SHEET, { params });
		return data?.data;
	},

	/**
	 * Fetch the payroll exceptions list for a given home and pay period.
	 * Returns three arrays: unresolvedOverage, bankCapExceeded, negativeBalances.
	 *
	 * @param {Object} params
	 * @param {string}  params.homeId
	 * @param {number}  params.payYear
	 * @param {number}  params.periodNumber
	 * @returns {Promise<{ unresolvedOverage: Array, bankCapExceeded: Array, negativeBalances: Array }>}
	 */
	getExceptions: async (params = {}) => {
		const { data } = await axiosClient.get(API_ENDPOINTS.PAYROLL.EXCEPTIONS, { params });
		return data?.data;
	},

	/**
	 * Fetch the payroll summary for a single caregiver in a given pay period.
	 *
	 * @param {Object} params
	 * @param {string}  params.caregiverId
	 * @param {number}  params.payYear
	 * @param {number}  params.periodNumber
	 * @returns {Promise<Object>}
	 */
	getCaregiverSummary: async ({ caregiverId, ...params }) => {
		const { data } = await axiosClient.get(
			API_ENDPOINTS.PAYROLL.CAREGIVER_SUMMARY(caregiverId),
			{ params }
		);
		return data?.data;
	},

	/**
	 * Create a manual payroll entry for a caregiver.
	 *
	 * @param {Object} params
	 * @param {string}  params.caregiverId
	 * @param {Object}  params.body  - { category, amount, payYear, periodNumber, reason, note?, homeId? }
	 * @returns {Promise<Object>}
	 */
	createEntry: async ({ caregiverId, body }) => {
		const { data } = await axiosClient.post(
			API_ENDPOINTS.PAYROLL.CAREGIVER_ENTRIES(caregiverId),
			body
		);
		return data?.data;
	},

	/**
	 * Fetch a single manual payroll entry by its ID.
	 *
	 * @param {string} entryId - The entry's database ID.
	 * @returns {Promise<Object>}
	 */
	getEntry: async (entryId) => {
		const { data } = await axiosClient.get(API_ENDPOINTS.PAYROLL.ENTRY_BY_ID(entryId));
		return data?.data;
	},

	/**
	 * Void a manual payroll entry.
	 * The entry must currently be in "approved" status.
	 *
	 * @param {Object} params
	 * @param {string}  params.entryId  - The entry's database ID.
	 * @param {Object}  params.body     - { reason: string }
	 * @returns {Promise<Object>}
	 */
	voidEntry: async ({ entryId, body }) => {
		const { data } = await axiosClient.post(API_ENDPOINTS.PAYROLL.ENTRY_VOID(entryId), body);
		return data?.data;
	},

	/**
	 * Force a stat recompute for a given pay period.
	 * Returns counts and a per-staff qualification audit.
	 *
	 * @param {Object} body
	 * @param {number}  body.payYear
	 * @param {number}  body.periodNumber
	 * @returns {Promise<{ granted, updated, pruned, evaluated, results }>}
	 */
	recomputeStats: async (body = {}) => {
		const { data } = await axiosClient.post(API_ENDPOINTS.PAYROLL.STAT_RECOMPUTE, body);
		return data?.data;
	},
};
