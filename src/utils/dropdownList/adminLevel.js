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

// Which Direct Leader slot(s) an admin of each level has. team_lead and
// office_admin each have two (only one required — enforced in onSubmit, not
// yup, in Info.js/add_new_admin/page.js); supervisor, manager and payroll
// have exactly one; administrator/super have none (outside the hierarchy).
export const DIRECT_LEADER_SLOTS_BY_LEVEL = {
	team_lead:     ["supervisor", "manager"],
	office_admin:  ["manager", "administrator"],
	payroll:       ["administrator"],
	supervisor:    ["manager"],
	manager:       ["administrator"],
	administrator: [],
	super:         [],
};

// Display label per (level, slot) — kept separate from the slot name itself
// since a slot's eligible pool for a given level doesn't always match its
// raw backend name, so the label can diverge from the slot even though every
// value below happens to equal its own slot's name right now.
export const DIRECT_LEADER_FIELD_LABELS = {
	team_lead:     { supervisor: "Supervisor", manager: "Manager" },
	office_admin:  { manager: "Manager",       administrator: "Administrator" },
	payroll:       { administrator: "Administrator" },
	supervisor:    { manager: "Manager" },
	manager:       { administrator: "Administrator" },
};

// Numeric rank for "who may edit/deactivate/delete whom" — higher outranks
// lower. Manager and Payroll Admin share a rank, so neither may act on the
// other. Super Admin has no entry here: it's a bypass handled separately by
// callers, not a rank to compare against.
export const ADMIN_RANK = {
	administrator: 5,
	manager:       4,
	payroll:       4,
	office_admin:  3,
	supervisor:    2,
	team_lead:     1,
};

// True only when actingLevel ranks strictly above targetLevel — equal rank
// (e.g. manager vs payroll) or either level missing from the table (super,
// or an unrecognized value) returns false.
export const adminOutranks = (actingLevel, targetLevel) => {
	const actingRank = ADMIN_RANK[actingLevel];
	const targetRank = ADMIN_RANK[targetLevel];
	return actingRank != null && targetRank != null && actingRank > targetRank;
};
