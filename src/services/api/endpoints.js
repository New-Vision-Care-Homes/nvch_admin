export const API_ENDPOINTS = {
	/* All related endpoints for auth */
	AUTH: {
		LOGIN: '/api/auth/login',
		FORGOT_PASSWORD: '/api/auth/forgot-password',
	},

	/* All related endpoints for admins */
	ADMINS: {
		BASE: '/api/auth/admin/admins',
		BY_ID: (id) => `/api/auth/admin/admins/${id}`,
		CREATE: '/api/auth/register',
		TOGGLE_STATUS: (id) => `/api/auth/admin/admins/${id}/toggle-status`,
	},

	/* All related endpoints for caregivers */
	CAREGIVERS: {
		BASE: '/api/auth/admin/caregivers',
		BY_ID: (id) => `/api/auth/admin/users/${id}`,
		CREATE: '/api/auth/register',
	},

	/* All related endpoints for clients */
	CLIENTS: {
		BASE: '/api/auth/admin/clients',
		BY_ID: (id) => `/api/auth/admin/users/${id}`,
		CREATE: '/api/auth/register',
	},

	/* All related endpoints for shifts */
	SHIFTS: {
		BASE: '/api/shifts',
		BY_ID: (id) => `/api/shifts/${id}`,
	},

	/* All related endpoints for homes */
	HOMES: {
		BASE: '/api/homes',
		BY_ID: (id) => `/api/homes/${id}`,
	},

	/* All related endpoints for personal profile page */
	PROFILE: {
		BASE: '/api/auth/profile',
	},

	/* All related endpoints for caregiver hours */
	HOURS: {
		GET_CAREGIVER_HOURS: (id) => `/api/hours/caregivers/${id}`,
		GET_CAREGIVER_HISTORY: (id) => `/api/hours/caregivers/${id}/history`,
	},

	/* All related endpoints for upload profile picture and certificates */
	UPLOAD: {
		GET_PRE_SIGNED_URL: '/api/upload/signed-url',
		PROFILE_PICTURE: '/api/upload/profile-picture',
		CERTIFICATE: '/api/upload/certificate',
	}
};
