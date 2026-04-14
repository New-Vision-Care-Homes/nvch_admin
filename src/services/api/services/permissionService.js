import axiosClient from '../axiosClient';
import { API_ENDPOINTS } from '../endpoints';

/**
 * Service to handle all permission-related API requests.
 * Inherits base URL and Auth headers from axiosClient.
 */
export const permissionService = {
	/**
	 * Fetch all permission groups from the endpoint.
	 * @param {Object} params - Optional query parameters (search, page, limit)
	 * @returns {Promise<Array>} List of permission group objects.
	 */
	getAll: async (params = {}) => {
		const queryParams = new URLSearchParams();
		if (params.search) queryParams.append('search', params.search);
		if (params.page) queryParams.append('page', params.page);
		if (params.limit) queryParams.append('limit', params.limit);
		if (params.isActive !== undefined && params.isActive !== "") {
			queryParams.append('isActive', params.isActive);
		}

		const queryString = queryParams.toString();
		const url = queryString ? `${API_ENDPOINTS.PERMISIIONS.BASE}?${queryString}` : API_ENDPOINTS.PERMISIIONS.BASE;

		const { data } = await axiosClient.get(url);
		return data.data.permissionGroups;
	},

	/**
	 * Fetch a single permission group by their ID.
	 * @param {string|number} id - The unique identifier of the permission group.
	 * @returns {Promise<Object>} The permission group detail object.
	 */
	getPermissionGroup: async (id) => {
		const { data } = await axiosClient.get(API_ENDPOINTS.PERMISIIONS.BY_ID(id));
		return data.data.permissionGroup;
	},

	/**
	 * Delete a specific permission group by their ID.
	 * @param {string|number} id - The unique identifier of the permission group.
	 */
	delete: async (id) => {
		const { data } = await axiosClient.delete(API_ENDPOINTS.PERMISIIONS.BY_ID(id));
		return data.data.permissionGroup;
	},

	/**
	 * Create a new permission group record.
	 * @param {Object} permissionGroupData - The payload containing permission group details.
	 */
	create: async (permissionGroupData) => {
		const { data } = await axiosClient.post(API_ENDPOINTS.PERMISIIONS.BASE, permissionGroupData);
		return data.data.permissionGroup;
	},

	/**
	 * Update an existing permission group's information.
	 * @param {string|number} id - The unique identifier.
	 * @param {Object} updateData - The fields to be updated.
	 */
	update: async (id, updateData) => {
		const { data } = await axiosClient.put(API_ENDPOINTS.PERMISIIONS.BY_ID(id), updateData);
		return data.data.permissionGroup;
	},
};