import axiosClient from '../axiosClient';

/**
 * Service to handle all Caregiver-related API requests.
 * Inherits base URL and Auth headers from axiosClient.
 */
export const caregiverService = {
    /**
     * Fetch all caregivers from the administrative endpoint.
     * @returns {Promise<Array>} List of caregiver objects.
     */
    getAll: async () => {
        const { data } = await axiosClient.get('/api/auth/admin/caregivers');
        return data.data.caregivers;
    },

    /**
     * Delete a specific caregiver by their ID.
     * @param {string|number} id - The unique identifier of the caregiver.
     */
    delete: async (id) => {
        const { data } = await axiosClient.delete(`/api/auth/admin/users/${id}`);
        return data;
    },

    /**
     * Create a new caregiver record.
     * @param {Object} caregiverData - The payload containing caregiver details.
     */
    create: async (caregiverData) => {
        const { data } = await axiosClient.post('/api/auth/admin/users', caregiverData);
        return data;
    },

    /**
     * Update an existing caregiver's information.
     * @param {string|number} id - The unique identifier.
     * @param {Object} updateData - The fields to be updated.
     */
    update: async (id, updateData) => {
        const { data } = await axiosClient.put(`/api/auth/admin/users/${id}`, updateData);
        return data;
    }
};