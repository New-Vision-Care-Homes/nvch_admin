import axiosClient from '../axiosClient';
import { API_ENDPOINTS } from '../endpoints';

/**
 * Service to handle all Caregiver-related API requests.
 * Inherits base URL and Auth headers from axiosClient.
 */
export const caregiverService = {
	/**
	 * Fetch all caregivers from the administrative endpoint.
	 * @param {Object} params - Optional query parameters (search, page, limit)
	 * @returns {Promise<Array>} List of caregiver objects.
	 */
	getAll: async (params = {}) => {
		const queryParams = new URLSearchParams();
		if (params.search) queryParams.append('search', params.search);
		if (params.page) queryParams.append('page', params.page);
		if (params.limit) queryParams.append('limit', params.limit);

		const queryString = queryParams.toString();
		const url = queryString ? `${API_ENDPOINTS.CAREGIVERS.BASE}?${queryString}` : API_ENDPOINTS.CAREGIVERS.BASE;

		const { data } = await axiosClient.get(url);
		return data.data.caregivers;
	},

	/**
	 * Fetch a single client by their ID.
	 * @param {string|number} id - The unique identifier of the client.
	 * @returns {Promise<Object>} The client detail object.
	 */
	getCaregiver: async (id) => {
		const { data } = await axiosClient.get(API_ENDPOINTS.CAREGIVERS.BY_ID(id));
		return data.data.user;
	},

	/**
	 * Delete a specific caregiver by their ID.
	 * @param {string|number} id - The unique identifier of the caregiver.
	 */
	delete: async (id) => {
		const { data } = await axiosClient.delete(API_ENDPOINTS.CAREGIVERS.BY_ID(id));
		return data;
	},

	/**
	 * Create a new caregiver record.
	 * @param {Object} caregiverData - The payload containing caregiver details.
	 */
	create: async (caregiverData) => {
		const { data } = await axiosClient.post(API_ENDPOINTS.CAREGIVERS.CREATE, caregiverData);
		return data;
	},

	/**
	 * Update an existing caregiver's information.
	 * @param {string|number} id - The unique identifier.
	 * @param {Object} updateData - The fields to be updated.
	 */
	update: async (id, updateData) => {
		const { data } = await axiosClient.put(API_ENDPOINTS.CAREGIVERS.BY_ID(id), updateData);
		return data;
	}
};