import axiosClient from '../axiosClient';

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

		const queryString = queryParams.toString();
		const url = queryString
			? `/api/auth/admin/admins?${queryString}`
			: '/api/auth/admin/admins';

		const { data } = await axiosClient.get(url);
		// Handle both response shapes: data.data.admins or data.admins
		return data?.data?.admins ?? data?.admins ?? [];
	},

	/**
	 * Fetch a single admin by their ID.
	 * @param {string|number} id - The unique identifier of the admin.
	 * @returns {Promise<Object>} The admin detail object.
	 */
	getAdmin: async (id) => {
		const { data } = await axiosClient.get(`/api/auth/admin/users/${id}`);
		return data.data.user;
	},

	/**
	 * Delete a specific admin by their ID.
	 * @param {string|number} id - The unique identifier of the admin.
	 */
	delete: async (id) => {
		const { data } = await axiosClient.delete(`/api/auth/admin/users/${id}`);
		return data;
	},

	/**
	 * Create a new admin record.
	 * @param {Object} adminData - The payload containing admin details.
	 */
	create: async (adminData) => {
		const { data } = await axiosClient.post('/api/auth/admin/users', adminData);
		return data;
	},

	/**
	 * Update an existing admin's information.
	 * @param {string|number} id - The unique identifier.
	 * @param {Object} updateData - The fields to be updated.
	 */
	update: async (id, updateData) => {
		const { data } = await axiosClient.put(`/api/auth/admin/users/${id}`, updateData);
		return data;
	}
};
