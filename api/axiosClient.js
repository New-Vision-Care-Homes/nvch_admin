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
	timeout: 15000, // Timeout after 15 seconds
});

// Request Interceptor: Attach JWT token to every request automatically
axiosClient.interceptors.request.use((config) => {
	const token = localStorage.getItem("token");
	console.log("token: ", token);
	if (token) {
		config.headers.Authorization = `Bearer ${token}`;
	}
	return config;
}, (error) => Promise.reject(error));

export default axiosClient;