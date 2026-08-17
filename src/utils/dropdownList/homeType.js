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
