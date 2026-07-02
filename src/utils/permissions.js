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
			"toggle_admin_status",
			// Admin may sign in to the mobile app. Portal access does not require this.
			"access_app"
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
			"view_assigned_caregivers",
			"toggle_caregiver_status"
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
			"view_assigned_clients",
			"toggle_client_status"
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
			"view_hours"
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
		module: "Certificates",
		slugs: [
			"approve_all_certificates",
			"approve_assigned_certificates"
		]
	}
	// view_own_profile / update_own_profile / change_own_password are implicit
	// for every authenticated user (backend IMPLICIT_SELF_SLUGS) — they are not
	// grantable and the backend excludes them from /api/permissions/definitions.
];

/** Implicit self-service slugs — held by every user, never shown as grantable. */
export const IMPLICIT_SELF_SLUGS = [
	"view_own_profile",
	"update_own_profile",
	"change_own_password"
];

// Mirrors the backend's toRegions (userAuthorization.ts): regions array with a
// legacy fallback to the singular region field.
const toRegions = (doc) => {
	const regions = Array.isArray(doc?.regions) ? [...doc.regions] : [];
	if (regions.length === 0 && doc?.region) regions.push(doc.region);
	return regions;
};

/**
 * Mirrors the backend's assertCanManageUser scoping (userAuthorization.ts):
 * the "all" slug grants unconditionally; the "assigned" slug grants only when
 * the target shares a region with the requester — fail-closed when either
 * side has no regions on file. Use this instead of a bare `includes(slug)`
 * check whenever an action accepts an assigned-scope slug, so the UI never
 * shows a control the backend would reject for out-of-region targets.
 */
export const canManageTarget = (profile, target, allSlug, assignedSlug) => {
	const slugs = profile?.permissionSlugs ?? [];
	if (slugs.includes(allSlug)) return true;
	if (!assignedSlug || !slugs.includes(assignedSlug)) return false;
	const requesterRegions = toRegions(profile);
	return toRegions(target).some(r => requesterRegions.includes(r));
};

export const ALL_PERMISSION_SLUGS = PERMISSION_SCHEMAS.reduce((acc, current) => {
	return [...acc, ...current.slugs];
}, []);
