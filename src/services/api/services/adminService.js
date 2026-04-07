import axiosClient from '../axiosClient';
import { API_ENDPOINTS } from '../endpoints';

/**
 * Service to handle all Admin-related API requests.
 * Inherits base URL and Auth headers from axiosClient.
 */
export const adminService = {
	/**
	 * Fetch all admins from the administrative endpoint.
	 * @param {Object} params - Optional query parameters (search, page, limit)
	 * @returns {Promise<Array>} List of admin objects.
	 */
	getAll: async (params = {}) => {
		const queryParams = new URLSearchParams();
		if (params.search) queryParams.append('search', params.search);
		if (params.page) queryParams.append('page', params.page);
		if (params.limit) queryParams.append('limit', params.limit);
		if (params.isActive !== undefined && params.isActive !== '') queryParams.append('isActive', params.isActive);

		const queryString = queryParams.toString();
		const url = queryString
			? `${API_ENDPOINTS.ADMINS.BASE}?${queryString}`
			: API_ENDPOINTS.ADMINS.BASE;

		const { data } = await axiosClient.get(url);
		// Return full response so hooks can access both the list and pagination metadata
		return data?.data;
	},

	/**
	 * Fetch a single admin by their ID.
	 * @param {string|number} id - The unique identifier of the admin.
	 * @returns {Promise<Object>} The admin detail object.
	 */
	getAdmin: async (id) => {
		const { data } = await axiosClient.get(API_ENDPOINTS.ADMINS.BY_ID(id));
		return data.data.user;
	},

	/**
	 * Delete a specific admin by their ID.
	 * @param {string|number} id - The unique identifier of the admin.
	 */
	delete: async (id) => {
		const { data } = await axiosClient.delete(API_ENDPOINTS.ADMINS.BY_ID(id));
		return data;
	},

	/**
	 * Create a new admin record.
	 * @param {Object} adminData - The payload containing admin details.
	 */
	create: async (adminData) => {
		const { data } = await axiosClient.post(API_ENDPOINTS.ADMINS.BASE, adminData);
		return data;
	},

	/**
	 * Update an existing admin's information.
	 * @param {string|number} id - The unique identifier.
	 * @param {Object} updateData - The fields to be updated.
	 */
	update: async (id, updateData) => {
		const { data } = await axiosClient.put(API_ENDPOINTS.ADMINS.BY_ID(id), updateData);
		return data;
	}
};
