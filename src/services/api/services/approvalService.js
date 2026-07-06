import axiosClient from '../axiosClient';
import { API_ENDPOINTS } from '../endpoints';

/**
 * Service for all Approval-related API requests.
 * Base path: /api/approvals
 */
export const approvalService = {
	/**
	 * Fetch the caller's approval queue — pending approvals they may decide, newest first.
	 * @param {Object} params - page, limit
	 * @returns {Promise<{ approvals: Array, pagination: Object }>}
	 */
	getQueue: async (params = {}) => {
		const { data } = await axiosClient.get(API_ENDPOINTS.APPROVALS.BASE, { params });
		return data?.data;
	},

	/**
	 * Fetch approvals the caller requested, any status.
	 * @param {Object} params - page, limit
	 * @returns {Promise<{ approvals: Array, pagination: Object }>}
	 */
	getMine: async (params = {}) => {
		const { data } = await axiosClient.get(API_ENDPOINTS.APPROVALS.MINE, { params });
		return data?.data;
	},

	/**
	 * Fetch a single approval by ID.
	 * Returns 404 if the caller may not see it (not requester or eligible approver).
	 * @param {string} id
	 * @returns {Promise<Object>} The approval object.
	 */
	getOne: async (id) => {
		const { data } = await axiosClient.get(API_ENDPOINTS.APPROVALS.BY_ID(id));
		return data?.data?.approval;
	},

	/**
	 * Approve a pending approval.
	 * @param {string} id
	 * @param {{ reason?: string }} body
	 * @returns {Promise<Object>} Updated approval.
	 */
	approve: async (id, body = {}) => {
		const { data } = await axiosClient.post(API_ENDPOINTS.APPROVALS.APPROVE(id), body);
		return data?.data?.approval;
	},

	/**
	 * Reject a pending approval. Reason is required (1–1000 chars).
	 * @param {string} id
	 * @param {{ reason: string }} body
	 * @returns {Promise<Object>} Updated approval.
	 */
	reject: async (id, body) => {
		const { data } = await axiosClient.post(API_ENDPOINTS.APPROVALS.REJECT(id), body);
		return data?.data?.approval;
	},

	/**
	 * Cancel a pending approval. Only the requester or a super admin may cancel.
	 * @param {string} id
	 * @returns {Promise<Object>} Updated approval.
	 */
	cancel: async (id) => {
		const { data } = await axiosClient.post(API_ENDPOINTS.APPROVALS.CANCEL(id));
		return data?.data?.approval;
	},
};
