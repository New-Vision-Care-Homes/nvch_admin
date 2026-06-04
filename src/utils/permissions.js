/**
 * Canonical permissions mapping as defined by the backend.
 * This is used to render the categorized UI for permission selection.
 */
export const PERMISSION_SCHEMAS = [
	{
		module: "Admin",
		slugs: [
			"create_admin",
			"update_admin",
			"delete_admin",
			"view_admin",
			// Admin may sign in to the mobile app. Portal access does not require this.
			"access_app"
		]
	},
	{
		module: "User management",
		slugs: [
			"list_users",
			"view_user",
			"update_user",
			"toggle_user_status",
			"delete_user"
		]
	},
	{
		module: "Caregiver",
		slugs: [
			"create_caregivers",
			"view_all_caregivers",
			"update_all_caregivers",
			"delete_all_caregivers",
			"update_assigned_caregivers",
			"delete_assigned_caregivers",
			"view_assigned_caregivers"
		]
	},
	{
		module: "Client",
		slugs: [
			"create_clients",
			"view_all_clients",
			"update_all_clients",
			"delete_all_clients",
			"delete_assigned_clients",
			"update_assigned_clients",
			"view_assigned_clients"
		]
	},
	{
		module: "Home",
		slugs: [
			"create_home",
			"view_all_homes",
			"update_home",
			"delete_home",
			"view_home"
		]
	},
	{
		module: "Hours",
		slugs: [
			"update_hours",
			"delete_hours",
			"view_hours"
		]
	},
	{
		module: "Permissions (module)",
		slugs: [
			"view_permissions",
			"update_permissions",
			"delete_permissions"
		]
	},
	{
		module: "Permission groups",
		slugs: [
			"view_permissions_groups",
			"update_permissions_groups",
			"delete_permissions_groups"
		]
	},
	{
		module: "Shifts",
		slugs: [
			"create_shifts",
			"update_shifts",
			"cancel_shifts",
			"start_shifts",
			"end_shifts",
			"view_shifts"
		]
	},
	{
		module: "Focus notes",
		slugs: [
			"create_focus_notes",
			"view_focus_notes",
			"update_focus_notes",
			"delete_focus_notes"
		]
	},
	{
		module: "Uploads",
		slugs: [
			"use_upload_urls"
		]
	},
	{
		module: "Profile (all users)",
		slugs: [
			"view_own_profile",
			"update_own_profile",
			"change_own_password"
		]
	}
];

export const ALL_PERMISSION_SLUGS = PERMISSION_SCHEMAS.reduce((acc, current) => {
	return [...acc, ...current.slugs];
}, []);
