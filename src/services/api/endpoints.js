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

	/* All related endpoints for approvals */
	APPROVALS: {
		BASE: '/api/approvals',
		MINE: '/api/approvals/mine',
		BY_ID: (id) => `/api/approvals/${id}`,
		APPROVE: (id) => `/api/approvals/${id}/approve`,
		REJECT: (id) => `/api/approvals/${id}/reject`,
		CANCEL: (id) => `/api/approvals/${id}/cancel`,
	},

	/* All related endpoints for payroll */
	PAYROLL: {
		COVER_SHEET:              '/api/payroll/cover-sheet',
		EXCEPTIONS:               '/api/payroll/exceptions',
		STAT_RECOMPUTE:           '/api/payroll/stat/recompute',
		CAREGIVER_SUMMARY:        (caregiverId) => `/api/payroll/caregivers/${caregiverId}/summary`,
		CAREGIVER_ENTRIES:        (caregiverId) => `/api/payroll/caregivers/${caregiverId}/entries`,
		ENTRY_BY_ID:              (id) => `/api/payroll/entries/${id}`,
		ENTRY_VOID:               (id) => `/api/payroll/entries/${id}/void`,
		OVERTIME_ACKNOWLEDGMENTS:  '/api/payroll/overtime/acknowledgments',
		HOUSE_REVIEWS:             (payYear, periodNumber) => `/api/payroll/pay-periods/${payYear}/${periodNumber}/house-reviews`,
		HOUSE_REVIEW:              (houseId, payYear, periodNumber) => `/api/payroll/houses/${houseId}/pay-periods/${payYear}/${periodNumber}/review`,
		HOUSE_SUPERVISOR_REVIEW:   (houseId, payYear, periodNumber) => `/api/payroll/houses/${houseId}/pay-periods/${payYear}/${periodNumber}/supervisor-review`,
		HOUSE_PAYROLL_STATUS:      (houseId, payYear, periodNumber) => `/api/payroll/houses/${houseId}/pay-periods/${payYear}/${periodNumber}/payroll-status`,
	},

	/* All related endpoints for stat holidays */
	HOLIDAYS: {
		BASE:    '/api/holidays',
		BY_ID:   (id) => `/api/holidays/${id}`,
	},

	/* All related endpoints for admin-scheduled trainings */
	TRAININGS: {
		BASE:                 '/api/trainings',
		TYPES:                '/api/trainings/types',
		BY_ID:                (id) => `/api/trainings/${id}`,
		ATTENDEES:            (id) => `/api/trainings/${id}/attendees`,
		ATTENDEE_BY_ID:       (id, caregiverId) => `/api/trainings/${id}/attendees/${caregiverId}`,
		ATTENDEE_ATTENDANCE:  (id, caregiverId) => `/api/trainings/${id}/attendees/${caregiverId}/attendance`,
		ATTENDANCE_CLOCK_IN:  (id) => `/api/trainings/${id}/attendance/clock-in`,
		ATTENDANCE_CLOCK_OUT: (id) => `/api/trainings/${id}/attendance/clock-out`,
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
