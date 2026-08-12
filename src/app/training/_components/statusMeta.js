// Shared training.status → StatusBadge label/tone mapping (list + detail pages).
export const TRAINING_STATUS_META = {
    scheduled: { label: "Scheduled", tone: "info" },
    completed: { label: "Completed", tone: "success" },
    cancelled: { label: "Cancelled", tone: "neutral" },
};

// Shared attendee.status → StatusBadge label/tone mapping (roster + status modal).
export const ATTENDEE_STATUS_META = {
    pending:   { label: "Pending",   tone: "neutral" },
    attended:  { label: "Attended",  tone: "info" },
    completed: { label: "Completed", tone: "success" },
    retake:    { label: "Retake",    tone: "warning" },
    failed:    { label: "Failed",    tone: "danger" },
};

export const ATTENDEE_STATUS_OPTIONS = Object.entries(ATTENDEE_STATUS_META).map(
    ([value, meta]) => ({ value, label: meta.label })
);

// training.sessionState → StatusBadge label/tone mapping. Read-only/derived,
// independent of the admin-controlled `status` field above — a live session
// reads in_progress even if nobody has clocked in yet.
export const SESSION_STATE_META = {
    upcoming:    { label: "Upcoming",    tone: "neutral" },
    in_progress: { label: "In Progress", tone: "warning" },
    ended:       { label: "Ended",       tone: "neutral" },
};

// attendance.state (per-attendee clock record) → display label.
export const ATTENDANCE_STATE_LABEL = {
    not_clocked_in: "Not clocked in",
    in_progress:    "In progress",
    clocked_out:    "Clocked out",
};
