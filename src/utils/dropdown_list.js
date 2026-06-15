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

export const DEPARTMENT_OPTIONS = [
	{ label: "Operations",      value: "Operations" },
	{ label: "Human Resources", value: "Human Resources" },
	{ label: "Finance",         value: "Finance" },
	{ label: "IT",              value: "IT" },
	{ label: "Administration",  value: "Administration" },
];

export const DEPARTMENT_COLORS = {
	"Operations":      { bg: "#e0e7ff", border: "#6366f1", text: "#3730a3" }, // indigo
	"Human Resources": { bg: "#ffe4e6", border: "#f43f5e", text: "#881337" }, // rose
	"Finance":         { bg: "#cffafe", border: "#06b6d4", text: "#164e63" }, // cyan
	"IT":              { bg: "#fae8ff", border: "#d946ef", text: "#701a75" }, // fuchsia
	"Administration":  { bg: "#ecfccb", border: "#84cc16", text: "#365314" }, // lime
};

export const CERTIFICATE_OPTIONS = [
	{ value: "child-abuse-registry-check", label: "Child Abuse Registry Check" },
	{ value: "criminal-vulnerable-sector-record-check", label: "Criminal & Vulnerable Sector Record Check" },
	{ value: "fire-safety", label: "Fire Safety" },
	{ value: "first-aid-cpr-level-c", label: "First Aid CPR Level C" },
	{ value: "food-handlers", label: "Food Handlers" },
	{ value: "medication-awareness", label: "Medication Awareness" },
	{ value: "umab-new", label: "UMAB New" },
	{ value: "whmis", label: "WHMIS" },
	{ value: "immigration-documentation", label: "Immigration Documentation" },
];

export const REGION_OPTIONS = [
	{ value: "Central", label: "Central" },
	{ value: "Windsor", label: "Windsor" },
	{ value: "HRM", label: "HRM" },
	{ value: "South Shore", label: "South Shore" },
];

export const MARITAL_STATUS_OPTIONS = [
	{ value: "single", label: "Single" },
	{ value: "married", label: "Married" },
	{ value: "divorced", label: "Divorced" },
	{ value: "widowed", label: "Widowed" },
	{ value: "separated", label: "Separated" },
];

export const HOME_TYPE_OPTIONS = [
	{ value: "SOH", label: "SOH" },
	{ value: "TEA", label: "TEA" },
	{ value: "TSA", label: "TSA" },
	{ value: "ILS", label: "ILS" },
	{ value: "IF", label: "IF" },
	{ value: "DSLTC", label: "DSLTC" },
];

// { bg, border, text } color tokens for each home type.
// Used wherever a home type needs a visual colour (list page, detail page, chips, etc.)
export const HOME_TYPE_COLORS = {
	SOH:   { bg: "#dbeafe", border: "#3b82f6", text: "#1e3a5f" }, // blue
	TEA:   { bg: "#d1fae5", border: "#10b981", text: "#064e3b" }, // emerald
	TSA:   { bg: "#ede9fe", border: "#8b5cf6", text: "#3b0764" }, // violet
	ILS:   { bg: "#fef3c7", border: "#d97706", text: "#78350f" }, // amber
	IF:    { bg: "#fce7f3", border: "#db2777", text: "#831843" }, // pink
	DSLTC: { bg: "#e0f2fe", border: "#0284c7", text: "#0c4a6e" }, // sky
};

// Region colours use a distinct palette from home types so they never clash.
export const REGION_COLORS = {
	"Central":     { bg: "#fee2e2", border: "#ef4444", text: "#991b1b" }, // red
	"Windsor":     { bg: "#ccfbf1", border: "#14b8a6", text: "#0f766e" }, // teal
	"HRM":         { bg: "#ffedd5", border: "#f97316", text: "#7c2d12" }, // orange
	"South Shore": { bg: "#e0e7ff", border: "#6366f1", text: "#3730a3" }, // indigo
};

export const COLOR_FALLBACK = { bg: "#f1f5f9", border: "#94a3b8", text: "#475569" };
