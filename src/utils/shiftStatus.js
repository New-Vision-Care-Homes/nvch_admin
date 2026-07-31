// Shared shift.status -> StatusBadge tone mapping, used everywhere a shift's
// status is shown as a badge (scheduling list/day/detail/edit, focus notes).
export const SHIFT_STATUS_TONE = {
	scheduled:   "info",
	in_progress: "warning",
	completed:   "success",
	cancelled:   "danger",
	missed:      "neutral",
};
