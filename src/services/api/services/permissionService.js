import axiosClient from '../axiosClient';
import { API_ENDPOINTS } from '../endpoints';

/**
 * All API calls related to permission groups and permission definitions.
 * Every method sends the JWT automatically via the axiosClient interceptor.
 */
export const permissionService = {

	/**
	 * Fetch a paginated list of permission groups.
	 * Returns the full response object (permissionGroups array + pagination info)
	 * so the hook can surface both the list and page count.
	 *
	 * @param {Object} params - Optional filters: search, page, limit, isActive
	 * @returns {Promise<{ permissionGroups: Array, pagination: Object }>}
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
		const url = queryString
			? `${API_ENDPOINTS.PERMISIIONS.BASE}?${queryString}`
			: API_ENDPOINTS.PERMISIIONS.BASE;

		const { data } = await axiosClient.get(url);
		// Return the full data object so the hook can read both
		// data.permissionGroups (the list) and data.pagination (page count, totals).
		return data.data;
	},

	/**
	 * Fetch a single permission group by its ID.
	 * Used on the detail/edit page to pre-populate the form.
	 *
	 * @param {string} id - MongoDB _id of the permission group
	 * @returns {Promise<Object>} The permission group object
	 */
	getPermissionGroup: async (id) => {
		const { data } = await axiosClient.get(API_ENDPOINTS.PERMISIIONS.BY_ID(id));
		return data.data.permissionGroup;
	},

	/**
	 * Permanently delete a permission group.
	 * Any users assigned to this group will lose those permissions.
	 *
	 * @param {string} id - MongoDB _id of the permission group to delete
	 */
	delete: async (id) => {
		const { data } = await axiosClient.delete(API_ENDPOINTS.PERMISIIONS.BY_ID(id));
		return data.data.permissionGroup;
	},

	/**
	 * Create a new permission group with a name, description, and list of slugs.
	 *
	 * @param {Object} permissionGroupData - { name, description, permissions: string[] }
	 * @returns {Promise<Object>} The newly created permission group
	 */
	create: async (permissionGroupData) => {
		const { data } = await axiosClient.post(API_ENDPOINTS.PERMISIIONS.BASE, permissionGroupData);
		return data.data.permissionGroup;
	},

	/**
	 * Replace the name, description, or slug list of an existing permission group.
	 *
	 * @param {string} id - MongoDB _id of the group to update
	 * @param {Object} updateData - Fields to change (name, description, permissions)
	 * @returns {Promise<Object>} The updated permission group
	 */
	update: async (id, updateData) => {
		const { data } = await axiosClient.put(API_ENDPOINTS.PERMISIIONS.BY_ID(id), updateData);
		return data.data.permissionGroup;
	},

	/**
	 * Fetch the canonical ordered list of every valid permission slug from the backend.
	 * This is the source of truth — use it instead of the hardcoded list in
	 * utils/permissions.js so new slugs added on the backend appear automatically.
	 *
	 * Requires: view_permissions OR update_permissions_groups on the JWT.
	 *
	 * @returns {Promise<string[]>} e.g. ["create_admin", "view_admin", ...]
	 */
	getDefinitions: async () => {
		const { data } = await axiosClient.get(API_ENDPOINTS.PERMISIIONS.DEFINITIONS);
		return data.data.permissions;
	},
};
