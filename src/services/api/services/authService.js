// services/authService.js
// Handles all authentication-related API requests

import axiosClient from '../axiosClient';
import { API_ENDPOINTS } from '../endpoints';

export const authService = {

	/**
	 * Login
	 * POST /api/auth/login
	 */
	userLogin: async (email, password) => {
		const response = await axiosClient.post(API_ENDPOINTS.AUTH.LOGIN, { email, password });
		return response.data.data;
	},

	/**
	 * Fetch the current logged-in user's profile
	 * GET /api/auth/profile
	 * @returns User object (id, email, firstName, lastName, role, ...)
	 */
	getProfile: async () => {
		const response = await axiosClient.get(API_ENDPOINTS.PROFILE.BASE);
		return response.data.data.user;
	},

	/**
	 * Update user profile
	 * PUT /api/auth/admin/users/:id
	 */
	updateProfile: async (updateData) => {
		const response = await axiosClient.put(API_ENDPOINTS.PROFILE.BASE, updateData);
		return response.data.data.user;
	},
};