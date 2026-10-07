import { COLOR_FALLBACK } from "./shared";

export const CLIENT_DOCUMENT_OPTIONS = [
	{ value: "iasp", label: "IASP" },
	{ value: "isp", label: "Individualized Support Plan" },
	{ value: "mar", label: "MAR" },
	{ value: "client-schedule", label: "Client Schedule" },
];

// { bg, border, text } color tokens per document type slug — cosmetic only,
// one distinct color per type so a row of type badges is scannable at a glance.
export const CLIENT_DOCUMENT_COLORS = {
	"iasp":             { bg: "#dbeafe", border: "#3b82f6", text: "#1e3a5f" }, // blue
	"isp":              { bg: "#ede9fe", border: "#8b5cf6", text: "#3b0764" }, // violet
	"mar":              { bg: "#d1fae5", border: "#10b981", text: "#064e3b" }, // emerald
	"client-schedule":  { bg: "#fef3c7", border: "#d97706", text: "#78350f" }, // amber
};

export const getClientDocumentColor = (slug) => CLIENT_DOCUMENT_COLORS[slug] || COLOR_FALLBACK;
