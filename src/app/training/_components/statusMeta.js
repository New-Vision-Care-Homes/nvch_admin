import { ClockArrowDown, ClockArrowUp, LogOut, Timer, MapPinOff, UserCog } from "lucide-react";

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

// attendance.flags[] → icon + color + label + description. Each flag gets a
// distinct icon/color pair so a row can show a small glanceable icon instead
// of a wall of text, with the full meaning surfaced in a legend once (see
// AttendeeRoster's FlagsLegend) rather than repeated per row.
export const ATTENDANCE_FLAG_META = {
    early_clock_in: {
        label:       "Early Clock-In",
        description: "Clocked in more than 1 minute before the scheduled start.",
        icon:        ClockArrowDown,
        color:       "#3b82f6",
    },
    late_clock_in: {
        label:       "Late Clock-In",
        description: "Clocked in more than 1 minute after the scheduled start.",
        icon:        ClockArrowUp,
        color:       "#d97706",
    },
    early_clock_out: {
        label:       "Early Clock-Out",
        description: "Clocked out more than 1 minute before the scheduled end.",
        icon:        LogOut,
        color:       "#0d9488",
    },
    late_clock_out: {
        label:       "Late Clock-Out",
        description: "Clocked out more than 1 minute after the scheduled end.",
        icon:        Timer,
        color:       "#f97316",
    },
    clock_out_location_not_verified: {
        label:       "Location Not Verified",
        description: "The clock-out GPS fix was outside the site geofence.",
        icon:        MapPinOff,
        color:       "#ef4444",
    },
    supervisor_recorded: {
        label:       "Supervisor Recorded",
        description: "One or both clock times were entered or edited by a supervisor.",
        icon:        UserCog,
        color:       "#8b5cf6",
    },
};
