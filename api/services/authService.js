// services/authService.js
// Handles all authentication-related API requests

import axiosClient from '../axiosClient';

export const authService = {
	/**
	 * Fetch the current logged-in user's profile
	 * GET /api/auth/profile
	 * @returns User object (id, email, firstName, lastName, role, ...)
	 */
	getProfile: async () => {
		const response = await axiosClient.get('/api/auth/profile');
		return response.data.data.user;
	},

	/**
	 * Update user profile
	 * PUT /api/auth/admin/users/:id
	 */
	updateProfile: async (id, updateData) => {
		const response = await axiosClient.put(`/api/auth/admin/users/${id}`, updateData);
		return response.data;
	},
};