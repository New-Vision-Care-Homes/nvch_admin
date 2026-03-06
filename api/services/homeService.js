import axiosClient from '../axiosClient';

/**
 * Service to handle all Home-related API requests.
 * Inherits base URL and Auth headers from axiosClient.
 */
export const homeService = {
	/**
	 * Fetch all homes from the API.
	 * @param {Object} params - Query parameters (page, limit, search, etc.)
	 * @returns {Promise<Object>} Object containing list of homes and pagination info.
	 */
	getAll: async (params = {}) => {
		const { data } = await axiosClient.get('/api/homes', { params });
		// Adjust return based on actual API response structure provided by user:
		// { success: true, data: { homes: [], pagination: {} } }
		return data.data;
	},

	/**
	 * Fetch a single home by ID.
	 * @param {string} id 
	 */
	getHome: async (id) => {
		const { data } = await axiosClient.get(`/api/homes/${id}`);
		return data.data;
	},

	/**
	 * Create a new home.
	 * @param {Object} homeData 
	 */
	create: async (homeData) => {
		const { data } = await axiosClient.post('/api/homes', homeData);
		return data.data;
	},

	/**
	 * Update a home.
	 * @param {string} id 
	 * @param {Object} updateData 
	 */
	update: async (id, updateData) => {
		const { data } = await axiosClient.put(`/api/homes/${id}`, updateData);
		return data.data;
	},

	/**
	 * Delete a home.
	 * @param {string} id 
	 */
	delete: async (id) => {
		const { data } = await axiosClient.delete(`/api/homes/${id}`);
		return data.data;
	}
};
