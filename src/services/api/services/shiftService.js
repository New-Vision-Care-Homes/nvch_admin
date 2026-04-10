import axiosClient from '../axiosClient';
import { API_ENDPOINTS } from '../endpoints';

/**
 * Service to handle all Shift-related API requests.
 * Inherits base URL and Auth headers from axiosClient.
 */
export const shiftService = {
	/**
	 * Fetch all shifts from the administrative endpoint.
	 * @param {Object} params - Query parameters.
	 * @returns {Promise<Array>} List of shift objects.
	 */
	getAll: async (params = {}) => {
		const { data } = await axiosClient.get(API_ENDPOINTS.SHIFTS.BASE, { params });
		return data?.data; // Enable access to pagination metadata
	},

	/**
	 * Fetch a single shift by their ID.
	 * @param {string|number} id - The unique identifier of the shift.
	 * @returns {Promise<Object>} The shift detail object.
	 */
	getShift: async (id) => {
		const { data } = await axiosClient.get(API_ENDPOINTS.SHIFTS.BY_ID(id));
		return data.data.shift;
	},

	/**
	 * Delete a specific shift by their ID.
	 * @param {string|number} id - The unique identifier of the shift.
	 */
	delete: async (id) => {
		const { data } = await axiosClient.delete(API_ENDPOINTS.SHIFTS.BY_ID(id));
		return data.data.shift;
	},

	/**
	 * Create a new shift record.
	 * @param {Object} shiftData - The payload containing shift details.
	 */
	create: async (shiftData) => {
		const { data } = await axiosClient.post(API_ENDPOINTS.SHIFTS.BASE, shiftData);
		return data.data.shift;
	},

	/**
	 * Update an existing shift's information.
	 * @param {string|number} id - The unique identifier.
	 * @param {Object} updateData - The fields to be updated.
	 */
	update: async (id, updateData) => {
		const { data } = await axiosClient.put(API_ENDPOINTS.SHIFTS.BY_ID(id), updateData);
		return data.data.shift;
	}
};