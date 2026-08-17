import { useTrainingTypes } from "@/hooks/useTrainings";
import { COLOR_FALLBACK } from "./shared";

// { bg, border, text } color tokens per trainingType slug — cosmetic only.
// The backend's GET /api/trainings/types response remains the source of
// truth for which slugs/labels are valid; this just assigns each a distinct
// pill color, matching the Homes page's type/region pill convention.
export const TRAINING_TYPE_COLORS = {
	"accessible-van-certification": { bg: "#dbeafe", border: "#3b82f6", text: "#1e3a5f" }, // blue
	"umab":                         { bg: "#d1fae5", border: "#10b981", text: "#064e3b" }, // emerald
	"first-aid-cpr-level-c":        { bg: "#fef3c7", border: "#d97706", text: "#78350f" }, // amber
};

export const getTrainingTypeColor = (slug) => TRAINING_TYPE_COLORS[slug] || COLOR_FALLBACK;

/**
 * Fetches the backend's canonical training types (via useTrainingTypes) and
 * pairs each with its dropdown option shape and pill color, so pages only
 * need one import for the whole training type dropdown + pill.
 */
export const useTrainingTypeDropdown = () => {
	const { trainingTypes, isTrainingTypesLoading, trainingTypesError } = useTrainingTypes();

	return {
		trainingTypes,                                                            // [{ value, label }]
		trainingTypeOptions: trainingTypes,                                       // already { value, label } shape
		getTrainingTypeColor,
		isTrainingTypesLoading,
		trainingTypesError,
	};
};
