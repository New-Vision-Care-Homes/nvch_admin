// services/hourService.js
// Handles all hour-related API requests

import axiosClient from '../axiosClient';
import { API_ENDPOINTS } from '../endpoints';

export const hourService = {
	/**
	 * Fetch the current caregiver's hours
	 * GET /api/hours/caregivers/:caregiverId
	 */
	getCaregiverHours: async (caregiverId) => {
		const response = await axiosClient.get(API_ENDPOINTS.HOURS.GET_CAREGIVER_HOURS(caregiverId));
		return response.data.data;
	},

	/**
	 * GET /api/hours/caregivers/:caregiverId/history
	 */
	getCaregiverHourHistory: async (caregiverId) => {
		const response = await axiosClient.get(API_ENDPOINTS.HOURS.GET_CAREGIVER_HISTORY(caregiverId));
		return response.data.data;
	},

	/**
	 * Update completed hour.
	 * @param {string} id 
	 * @param {Object} updateData 
	 */
	updateCompletedHour: async (id, updateData) => {
		const { data } = await axiosClient.put(API_ENDPOINTS.HOURS.UPDATE_CAREGIVER_HOURS(id), updateData);
		return data.message;
	},


};