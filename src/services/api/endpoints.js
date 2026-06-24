export const API_ENDPOINTS = {
	/* All related endpoints for auth */
	AUTH: {
		LOGIN: '/api/auth/login/portal',
		FORGOT_PASSWORD: '/api/auth/forgot-password',
		RESET_PASSWORD: '/api/auth/reset-password',
	},

	/* All related endpoints for admins */
	ADMINS: {
		BASE: '/api/auth/admin/admins',
		BY_ID: (id) => `/api/auth/admin/users/${id}`,
		CREATE: '/api/auth/register',
		TOGGLE_STATUS: (id) => `/api/auth/admin/users/${id}/toggle-status`,
	},

	/* All related endpoints for caregivers */
	CAREGIVERS: {
		BASE: '/api/auth/admin/caregivers',
		BY_ID: (id) => `/api/auth/admin/users/${id}`,
		CREATE: '/api/auth/register',
		TOGGLE_STATUS: (id) => `/api/auth/admin/users/${id}/toggle-status`,
	},

	/* All related endpoints for clients */
	CLIENTS: {
		BASE: '/api/auth/admin/clients',
		BY_ID: (id) => `/api/auth/admin/users/${id}`,
		CREATE: '/api/auth/register',
		TOGGLE_STATUS: (id) => `/api/auth/admin/users/${id}/toggle-status`,
	},

	/* All related endpoints for shifts */
	SHIFTS: {
		BASE: '/api/shifts',
		BY_ID: (id) => `/api/shifts/${id}`,
		CANCEL: (id) => `/api/shifts/${id}/cancel`,
		UPDATE_COMPLETED_SHIFT: (id) => `/api/hours/shifts/${id}`,
		BULK: '/api/shifts/bulk',
	},

	/* All related endpoints for homes */
	HOMES: {
		BASE: '/api/homes',
		BY_ID: (id) => `/api/homes/${id}`,
	},

	/* All related endpoints for personal profile page */
	PROFILE: {
		BASE: '/api/auth/profile',
		CHANGE_PASSWORD: '/api/auth/change-password',
	},

	/* All related endpoints for caregiver hours */
	HOURS: {
		GET_CAREGIVER_HOURS: (id) => `/api/hours/caregivers/${id}`,
		GET_CAREGIVER_HISTORY: (id) => `/api/hours/caregivers/${id}/history`,
		UPDATE_CAREGIVER_HOURS: (id) => `/api/hours/shifts/${id}`,
		GET_PAY_PERIODS: '/api/hours/pay-periods',
	},

	/* All related endpoints for upload profile picture and certificates */
	UPLOAD: {
		GET_PRE_SIGNED_URL: '/api/upload/signed-url',
		PROFILE_PICTURE: '/api/upload/profile-picture',
		CERTIFICATE: '/api/upload/certificate',
	},

	/* All related endpoints for permissions */
	PERMISIIONS: {
		BASE: '/api/permissions',
		BY_ID: (id) => `/api/permissions/${id}`,
		DEFINITIONS: '/api/permissions/definitions',
	},

	FOCUS_NOTES: {
		BASE: '/api/focus-notes',
		BY_CLIENT_ID: (clientId) => `/api/focus-notes/client/${clientId}`,
		BY_SHIFT_ID: (shiftId) => `/api/focus-notes/shift/${shiftId}`,
		BY_ID: (id) => `/api/focus-notes/${id}`,
	},

	/* All related endpoints for notifications */
	NOTIFICATIONS: {
		BASE: '/api/notifications',
		BY_ID: (id) => `/api/notifications/${id}`,
		COUNT: '/api/notifications/count',
		MARK_READ: (id) => `/api/notifications/${id}/read`,
		READ_ALL: '/api/notifications/read-all',
		STREAM_TOKEN: '/api/notifications/stream-token',
		STREAM: '/api/notifications/stream',
		BROADCAST: '/api/notifications/broadcast',
	},
};
