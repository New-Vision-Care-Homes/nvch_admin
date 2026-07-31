/*
 * This is the Network Layer. It handles global configurations like the Base URL and security tokens.
 */

import axios from 'axios';

/**
 * Global Axios instance for all API communications.
 * Configured with base URL and automatic Authorization header injection.
 */
const axiosClient = axios.create({
	baseURL: process.env.NEXT_PUBLIC_API_URL || "https://nvch-server.onrender.com", //might replace in the future
	timeout: 60000, // Timeout increased to 60s to account for Render cold starts
});

// Request Interceptor: Attach JWT token to every request automatically
axiosClient.interceptors.request.use((config) => {
	const token = sessionStorage.getItem("token");
	if (token) {
		config.headers.Authorization = `Bearer ${token}`;
	}
	return config;
}, (error) => Promise.reject(error));

// Response Interceptor: Normalize 403 errors into a consistent user-facing message.
// Permission slugs on the JWT are only refreshed on sign-in, so a 403 after a
// permission reassignment means the user must log out and back in to activate the change.
axiosClient.interceptors.response.use(
	(response) => response,
	(error) => {
		if (error?.response?.status === 403) {
			error.response.data = {
				error: "Insufficient permission. Please try logging out and signing in again.",
			};
		}
		return Promise.reject(error);
	}
);

export default axiosClient;