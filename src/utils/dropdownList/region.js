export const REGION_OPTIONS = [
	{ value: "Central", label: "Central" },
	{ value: "Windsor", label: "Windsor" },
	{ value: "HRM", label: "HRM" },
	{ value: "South Shore", label: "South Shore" },
];

// Region colours use a distinct palette from home types so they never clash.
export const REGION_COLORS = {
	"Central":     { bg: "#fee2e2", border: "#ef4444", text: "#991b1b" }, // red
	"Windsor":     { bg: "#ccfbf1", border: "#14b8a6", text: "#0f766e" }, // teal
	"HRM":         { bg: "#ffedd5", border: "#f97316", text: "#7c2d12" }, // orange
	"South Shore": { bg: "#e0e7ff", border: "#6366f1", text: "#3730a3" }, // indigo
};
