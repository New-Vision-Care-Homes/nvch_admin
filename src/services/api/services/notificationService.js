import axiosClient from '../axiosClient';
import { API_ENDPOINTS } from '../endpoints';

/**
 * Service to handle all Notification-related API requests.
 * Inherits base URL and Auth headers from axiosClient.
 * Portal surface only — no device registration (mobile-only).
 */
export const notificationService = {
	/**
	 * Fetch the caller's notification history, newest first.
	 * @param {Object} params - page, limit, unread (bool), todo (bool)
	 * @returns {Promise<{ notifications: Array, pagination: Object }>}
	 */
	getAll: async (params = {}) => {
		const { data } = await axiosClient.get(API_ENDPOINTS.NOTIFICATIONS.BASE, { params });
		return data?.data;
	},

	/**
	 * Fetch unread dot count and pending action count for the badge.
	 * @returns {Promise<{ unread: number, pendingActions: number }>}
	 */
	getCount: async () => {
		const { data } = await axiosClient.get(API_ENDPOINTS.NOTIFICATIONS.COUNT);
		return data?.data;
	},

	/**
	 * Fetch a single notification by ID.
	 * @param {string} id
	 * @returns {Promise<Object>} The notification object.
	 */
	getOne: async (id) => {
		const { data } = await axiosClient.get(API_ENDPOINTS.NOTIFICATIONS.BY_ID(id));
		return data?.data;
	},

	/**
	 * Clear the unread dot on a single notification.
	 * Call on tap, before navigating via action.route.
	 * @param {string} id
	 * @returns {Promise<Object>} Updated notification.
	 */
	markRead: async (id) => {
		const { data } = await axiosClient.patch(API_ENDPOINTS.NOTIFICATIONS.MARK_READ(id));
		return data?.data;
	},

	/**
	 * Clear every unread dot for the current portal surface.
	 * @returns {Promise<{ updated: number }>}
	 */
	markAllRead: async () => {
		const { data } = await axiosClient.patch(API_ENDPOINTS.NOTIFICATIONS.READ_ALL);
		return data?.data;
	},

	/**
	 * Mint a short-lived SSE stream token (valid ~60 s).
	 * Re-mint before each EventSource connect/reconnect.
	 * @returns {Promise<{ streamToken: string, expiresIn: number }>}
	 */
	getStreamToken: async () => {
		const { data } = await axiosClient.post(API_ENDPOINTS.NOTIFICATIONS.STREAM_TOKEN);
		return data?.data; // unwrap { success, data: { streamToken, expiresIn } }
	},

	/**
	 * Send a broadcast notification to a chosen audience.
	 * Requires send_broadcast_notifications permission (super admins always).
	 * @param {Object} broadcastData - { title, body?, sendPush?, target }
	 * @returns {Promise<{ recipients: number }>}
	 */
	broadcast: async (broadcastData) => {
		const { data } = await axiosClient.post(API_ENDPOINTS.NOTIFICATIONS.BROADCAST, broadcastData);
		return data?.data;
	},
};
