import axiosClient from '../axiosClient';
import { API_ENDPOINTS } from '../endpoints';

/**
 * Service to handle all FocusNote-related API requests.
 * Inherits base URL and Auth headers from axiosClient.
 */
export const focusNoteService = {
    /**
     * Fetch all focus notes for a specific client by client id.
     * @param {string|number} clientId - The unique identifier of the client.
     * @returns {Promise<Object>} The focus notes of the client.
     */
    getByClientId: async (clientId) => {
        const { data } = await axiosClient.get(API_ENDPOINTS.FOCUS_NOTES.BY_CLIENT_ID(clientId));
        return data.data;
    },

    /**
     * Fetch a single focus note by its ID.
     * @param {string} shiftNoteId
     */
    getByShiftNoteId: async (shiftNoteId) => {
        const { data } = await axiosClient.get(API_ENDPOINTS.FOCUS_NOTES.BY_ID(shiftNoteId));
        return data.data?.focusNote;
    },


    /**
     * Update an existing focus note.
     * @param {string|number} focusNoteId - The unique identifier of the focus note.
     * @param {Object} updateData - The fields to be updated.
     */
    update: async (focusNoteId, updateData) => {
        const { data } = await axiosClient.patch(API_ENDPOINTS.FOCUS_NOTES.BY_ID(focusNoteId), updateData);
        return data.data.focusNote;
    },

};