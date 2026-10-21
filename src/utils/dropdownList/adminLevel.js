export const ADMIN_LEVEL_OPTIONS = [
	//{ label: "Super Admin", value: "super" },
	{ label: "Administrator", value: "administrator" },
	{ label: "Manager", value: "manager" },
	{ label: "Supervisor", value: "supervisor" },
	{ label: "Office Admin", value: "office_admin" },
	{ label: "Team Lead", value: "team_lead" },
	{ label: "Payroll Admin", value: "payroll" },
];

export const ADMIN_LEVEL_COLORS = {
	super:         { bg: "#ede9fe", border: "#8b5cf6", text: "#3b0764" }, // violet  — highest privilege
	administrator: { bg: "#e0e7ff", border: "#6366f1", text: "#3730a3" }, // indigo  — most senior rank below super
	manager:       { bg: "#dbeafe", border: "#3b82f6", text: "#1e3a5f" }, // blue
	supervisor:    { bg: "#ccfbf1", border: "#14b8a6", text: "#0f766e" }, // teal
	office_admin:  { bg: "#ffedd5", border: "#f97316", text: "#7c2d12" }, // orange
	team_lead:     { bg: "#d1fae5", border: "#10b981", text: "#064e3b" }, // emerald
	payroll:       { bg: "#fef3c7", border: "#d97706", text: "#78350f" }, // amber
};

export const ADMIN_LEVEL_LABEL = {
	super:         "Super Admin",
	administrator: "Administrator",
	manager:       "Manager",
	supervisor:    "Supervisor",
	office_admin:  "Office Admin",
	team_lead:     "Team Lead",
	payroll:       "Payroll Admin",
};

// Which Direct Leader slot(s) an admin of each level has. team_lead,
// office_admin and payroll each have two (only one required — see the yup
// schemas in Info.js/add_new_admin/page.js); supervisor and manager have
// exactly one; administrator/super have none (outside the hierarchy).
export const DIRECT_LEADER_SLOTS_BY_LEVEL = {
	team_lead:     ["supervisor", "manager"],
	office_admin:  ["supervisor", "manager"],
	payroll:       ["supervisor", "manager"],
	supervisor:    ["manager"],
	manager:       ["administrator"],
	administrator: [],
	super:         [],
};

// Display label per (level, slot) — NOT the same as the slot name. The
// backend's eligibility table means a slot's actual eligible pool for a
// given level doesn't always match its raw name, so the label is chosen to
// reflect who the picker will actually show rather than the backend field
// name: e.g. office_admin's "supervisor" slot can only be filled by a
// Manager/Payroll Admin/Administrator, so it's labeled "Manager", and
// payroll's "supervisor" slot can only be filled by an Administrator, so
// it's labeled "Administrator".
export const DIRECT_LEADER_FIELD_LABELS = {
	team_lead:     { supervisor: "Supervisor",    manager: "Manager" },
	office_admin:  { supervisor: "Manager",       manager: "Administrator" },
	payroll:       { supervisor: "Administrator", manager: "Manager" },
	supervisor:    { manager: "Manager" },
	manager:       { administrator: "Administrator" },
};
