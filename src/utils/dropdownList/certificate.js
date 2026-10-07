import { COLOR_FALLBACK } from "./shared";

export const CERTIFICATE_OPTIONS = [
	{ value: "accessible-van-certification", label: "Accessible Van Certification" },
	{ value: "child-abuse-registry-check", label: "Child Abuse Registry Check" },
	{ value: "criminal-vulnerable-sector-record-check", label: "Criminal & Vulnerable Sector Record Check" },
	{ value: "fire-safety", label: "Fire Safety (three courses)" },
	{ value: "first-aid-cpr-level-c", label: "First Aid CPR Level C" },
	{ value: "food-handlers", label: "Food Handlers" },
	{ value: "medication-awareness", label: "Medication Awareness (Administration)" },
	{ value: "umab-new", label: "UMAB New" },
	{ value: "whmis", label: "WHMIS" },
	{ value: "immigration-documentation", label: "Immigration Documentation" },
	{ value: "drivers-abstract", label: "Drivers Abstract"},
];

// { bg, border, text } color tokens per certificate slug — cosmetic only,
// one distinct color per type so a row of type badges is scannable at a glance.
export const CERTIFICATE_COLORS = {
	"accessible-van-certification":            { bg: "#dbeafe", border: "#3b82f6", text: "#1e3a5f" }, // blue
	"child-abuse-registry-check":               { bg: "#ffe4e6", border: "#e11d48", text: "#881337" }, // rose
	"criminal-vulnerable-sector-record-check":  { bg: "#ffedd5", border: "#ea580c", text: "#7c2d12" }, // orange
	"fire-safety":                              { bg: "#fef3c7", border: "#d97706", text: "#78350f" }, // amber
	"first-aid-cpr-level-c":                    { bg: "#d1fae5", border: "#10b981", text: "#064e3b" }, // emerald
	"food-handlers":                            { bg: "#ecfccb", border: "#65a30d", text: "#365314" }, // lime
	"medication-awareness":                     { bg: "#ede9fe", border: "#8b5cf6", text: "#3b0764" }, // violet
	"umab-new":                                 { bg: "#e0e7ff", border: "#4f46e5", text: "#312e81" }, // indigo
	"whmis":                                    { bg: "#e0f2fe", border: "#0284c7", text: "#0c4a6e" }, // sky
	"immigration-documentation":                { bg: "#ccfbf1", border: "#0d9488", text: "#134e4a" }, // teal
	"drivers-abstract":                         { bg: "#fce7f3", border: "#db2777", text: "#831843" }, // pink
};

export const getCertificateColor = (slug) => CERTIFICATE_COLORS[slug] || COLOR_FALLBACK;
