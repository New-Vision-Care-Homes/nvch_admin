export const ADMIN_LEVEL_OPTIONS = [
	//{ label: "Super Admin", value: "super" },
	{ label: "Manager", value: "manager" },
	{ label: "Supervisor", value: "supervisor" },
	{ label: "Office Admin", value: "office_admin" },
	{ label: "Team Lead", value: "team_lead" },
	{ label: "Payroll Admin", value: "payroll" },
];

export const ADMIN_LEVEL_COLORS = {
	super:        { bg: "#ede9fe", border: "#8b5cf6", text: "#3b0764" }, // violet  — highest privilege
	manager:      { bg: "#dbeafe", border: "#3b82f6", text: "#1e3a5f" }, // blue
	supervisor:   { bg: "#ccfbf1", border: "#14b8a6", text: "#0f766e" }, // teal
	office_admin: { bg: "#ffedd5", border: "#f97316", text: "#7c2d12" }, // orange
	team_lead:    { bg: "#d1fae5", border: "#10b981", text: "#064e3b" }, // emerald
	payroll:      { bg: "#fef3c7", border: "#d97706", text: "#78350f" }, // amber
};

export const ADMIN_LEVEL_LABEL = {
	super:        "Super Admin",
	manager:      "Manager",
	supervisor:   "Supervisor",
	office_admin: "Office Admin",
	team_lead:    "Team Lead",
	payroll:      "Payroll Admin",
};
