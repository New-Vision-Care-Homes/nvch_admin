import axiosClient from '../axiosClient';
import { API_ENDPOINTS } from '../endpoints';

/**
 * Service to handle all FocusNote-related API requests.
 * Inherits base URL and Auth headers from axiosClient.
 */
export const focusNoteService = {
    /**
     * Create a focus note.
     * @param {Object} data - { shiftId, clientId, opportunitiesConcerns, successes, generalNotes }
     */
    create: async (data) => {
        const res = await axiosClient.post(API_ENDPOINTS.FOCUS_NOTES.BASE, data);
        return res.data.data.focusNote;
    },

    /**
     * Fetch all focus notes for a specific client.
     * @param {string|number} clientId - The unique identifier of the client.
     * @param {Object} params - Query parameters for pagination and filtering.
     */
    getByClientId: async (clientId, params = {}) => {
        const { data } = await axiosClient.get(API_ENDPOINTS.FOCUS_NOTES.BY_CLIENT_ID(clientId), { params });
        return data.data;
    },

    /**
     * Fetch all focus notes for a specific shift.
     * @param {string|number} shiftId - The unique identifier of the shift.
     * @param {Object} params - Query parameters for pagination and filtering.
     */
    getByShiftId: async (shiftId, params = {}) => {
        const { data } = await axiosClient.get(API_ENDPOINTS.FOCUS_NOTES.BY_SHIFT_ID(shiftId), { params });
        return data.data;
    },

    /**
     * Fetch a single focus note by its ID.
     * @param {string} id - The unique identifier of the focus note.
     */
    getById: async (id) => {
        const { data } = await axiosClient.get(API_ENDPOINTS.FOCUS_NOTES.BY_ID(id));
        return data.data?.focusNote;
    },

    /**
     * Update an existing focus note.
     * @param {string|number} id - The unique identifier of the focus note.
     * @param {Object} updateData - The fields to be updated.
     */
    update: async (id, updateData) => {
        const { data } = await axiosClient.patch(API_ENDPOINTS.FOCUS_NOTES.BY_ID(id), updateData);
        return data.data.focusNote;
    },

    /**
     * Delete a focus note.
     * @param {string|number} id - The unique identifier of the focus note.
     */
    delete: async (id) => {
        const { data } = await axiosClient.delete(API_ENDPOINTS.FOCUS_NOTES.BY_ID(id));
        return data.data.focusNote;
    }
};