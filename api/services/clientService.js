import axiosClient from '../axiosClient';

/**
 * Service to handle all Client-related API requests.
 * Inherits base URL and Auth headers from axiosClient.
 */
export const clientService = {
    /**
     * Fetch all clients from the administrative endpoint.
     * @returns {Promise<Array>} List of client objects.
     */
    getAll: async () => {
        const { data } = await axiosClient.get('/api/auth/admin/clients');
        return data.data.clients;
    },

	/**
     * Fetch a single client by their ID.
     * @param {string|number} id - The unique identifier of the client.
     * @returns {Promise<Object>} The client detail object.
     */
	getClient: async (id) => {
        const { data } = await axiosClient.get(`/api/auth/admin/users/${id}`);
        return data.data.user;
    },

    /**
     * Delete a specific client by their ID.
     * @param {string|number} id - The unique identifier of the client.
     */
    delete: async (id) => {
        const { data } = await axiosClient.delete(`/api/auth/admin/users/${id}`);
        return data.data.user;
    },

    /**
     * Create a new client record.
     * @param {Object} clientData - The payload containing client details.
     */
    create: async (clientData) => {
        const { data } = await axiosClient.post('/api/auth/admin/users', clientData);
        return data.data.user;
    },

    /**
     * Update an existing client's information.
     * @param {string|number} id - The unique identifier.
     * @param {Object} updateData - The fields to be updated.
     */
    update: async (id, updateData) => {
        const { data } = await axiosClient.put(`/api/auth/admin/users/${id}`, updateData);
        return data.data.user;
    }
};