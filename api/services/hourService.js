// services/hourService.js
// Handles all hour-related API requests

import axiosClient from '../axiosClient';

export const hourService = {
	/**
	 * Fetch the current caregiver's hours
	 * GET /api/hours/caregivers/:caregiverId
	 */
	getCaregiverHours: async (caregiverId) => {
		const response = await axiosClient.get(`/api/hours/caregivers/${caregiverId}`);
		return response.data.data;
	},

	/**
	 * GET /api/hours/caregivers/:caregiverId/history
	 */
	getCaregiverHourHistory: async (caregiverId) => {
		const response = await axiosClient.get(`api/hours/caregivers/${caregiverId}/history`);
		return response.data.data;
	},
};