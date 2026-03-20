import axiosClient from '../axiosClient';

/**
 * Service to handle all Client-related API requests.
 * Inherits base URL and Auth headers from axiosClient.
 */
export const clientService = {
	/**
	 * Fetch all clients from the administrative endpoint.
	 * @param {Object} params - Optional query parameters (search, page, limit)
	 * @returns {Promise<Array>} List of client objects.
	 */
	getAll: async (params = {}) => {
		const queryParams = new URLSearchParams();
		if (params.search) queryParams.append('search', params.search);
		if (params.page) queryParams.append('page', params.page);
		if (params.limit) queryParams.append('limit', params.limit);
		if (params.isActive !== undefined && params.isActive !== "") {
			queryParams.append('isActive', params.isActive);
		}

		const queryString = queryParams.toString();
		const url = queryString ? `/api/auth/admin/clients?${queryString}` : '/api/auth/admin/clients';

		const { data } = await axiosClient.get(url);
		return data.data; // Return the full wrapper to access pagination metrics
	},

	/**
	 * Fetch a single client by their ID.
	 * @param {string|number} id - The unique identifier of the client.
	 * @returns {Promise<Object>} The client detail object.
	 */
	getClient: async (id) => {
		const { data } = await axiosClient.get(`/api/auth/admin/users/${id}`);
		return data.data.user;
	},

	/**
	 * Delete a specific client by their ID.
	 * @param {string|number} id - The unique identifier of the client.
	 */
	delete: async (id) => {
		const { data } = await axiosClient.delete(`/api/auth/admin/users/${id}`);
		return data.data.user;
	},

	/**
	 * Create a new client record.
	 * @param {Object} clientData - The payload containing client details.
	 */
	create: async (clientData) => {
		const { data } = await axiosClient.post('/api/auth/register', clientData);
		return data.data.user;
	},

	/**
	 * Update an existing client's information.
	 * @param {string|number} id - The unique identifier.
	 * @param {Object} updateData - The fields to be updated.
	 */
	update: async (id, updateData) => {
		const { data } = await axiosClient.put(`/api/auth/admin/users/${id}`, updateData);
		return data.data.user;
	}
};