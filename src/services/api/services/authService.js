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

	/**
	 * Change the current user's password
	 * PUT /api/auth/change-password
	 */
	changePassword: async ({ password, newPassword }) => {
		const response = await axiosClient.put(API_ENDPOINTS.PROFILE.CHANGE_PASSWORD, { password, newPassword });
		return response.data;
	},

	/**
	 * Request a password reset OTP
	 * POST /api/auth/forgot-password
	 */
	forgotPassword: async (email) => {
		const response = await axiosClient.post(API_ENDPOINTS.AUTH.FORGOT_PASSWORD, { email });
		return response.data;
	},

	/**
	 * Reset password using email + OTP
	 * POST /api/auth/reset-password
	 */
	resetPassword: async ({ email, otp, password }) => {
		const response = await axiosClient.post(API_ENDPOINTS.AUTH.RESET_PASSWORD, { email, otp, password });
		return response.data;
	},
};