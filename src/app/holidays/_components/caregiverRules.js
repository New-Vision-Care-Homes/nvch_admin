import * as yup from "yup";

// ============================================================
// caregiverRules.js
// ------------------------------------------------------------
// Shared model for a holiday's caregiver rules, used by the
// create page, the edit page, and CaregiverRulesSection.
//
// A rule targets ONE employment type and STACKS one or more
// requirements combined by `match`:
//   { employmentStatus, match: "all" | "any", requirements: [...] }
// which is how a type can be held to e.g. 72 hours AND the
// 15-of-30 paid-days bracket. Backend contract:
// docs/api/holidays.md in nvch_server.
//
// Form shape mirrors the API except minBiweeklyHours is kept as
// a string (empty when not applicable) so the input stays
// controlled; rulesToPayload() casts it back to a number.
// ============================================================

// ─────────────────────────────────────────────────────────────────────────────
// Options
// ─────────────────────────────────────────────────────────────────────────────

export const EMPLOYMENT_STATUS_OPTIONS = [
    { value: "full_time", label: "Full-time" },
    { value: "casual",    label: "Casual" },
    { value: "term",      label: "Term" },
];

export const REQUIREMENT_OPTIONS = [
    { value: "automatic",          label: "Automatic" },
    { value: "min_biweekly_hours", label: "Min biweekly hours" },
    { value: "paid_days_bracket",  label: "Paid-days bracket (30-day)" },
];

export const MATCH_OPTIONS = [
    { value: "all", label: "Must meet ALL requirements" },
    { value: "any", label: "Must meet ANY requirement" },
];

export const REQUIREMENT_LABEL = Object.fromEntries(
    REQUIREMENT_OPTIONS.map((o) => [o.value, o.label])
);

export const MATCH_LABEL = {
    all: "Must meet all of the following",
    any: "Must meet any one of the following",
};

/** "Automatic" always passes, so stacking it with anything else is rejected by the API. */
const AUTOMATIC = "automatic";
const MAX_REQUIREMENTS = REQUIREMENT_OPTIONS.length;

// ─────────────────────────────────────────────────────────────────────────────
// Builders
// ─────────────────────────────────────────────────────────────────────────────

export const emptyRequirement = (type = AUTOMATIC) => ({ type, minBiweeklyHours: "" });

export const emptyRule = (employmentStatus) => ({
    employmentStatus,
    match:        "all",
    requirements: [emptyRequirement()],
});

/** Requirement types still free to pick inside this rule (current row's own value included). */
export function availableRequirementTypes(rule, reqIndex) {
    const used     = (rule.requirements ?? []).map((r) => r.type);
    const own      = used[reqIndex];
    const stacking = (rule.requirements ?? []).length > 1;
    return REQUIREMENT_OPTIONS.filter(
        (o) => o.value === own || (!used.includes(o.value) && !(stacking && o.value === AUTOMATIC))
    );
}

/** A rule can only grow while types remain and it isn't an "automatic" rule. */
export function canAddRequirement(rule) {
    const requirements = rule.requirements ?? [];
    return (
        requirements.length < MAX_REQUIREMENTS &&
        !requirements.some((r) => r.type === AUTOMATIC)
    );
}

export function addRequirementTo(rule) {
    if (!canAddRequirement(rule)) return rule;
    const used = (rule.requirements ?? []).map((r) => r.type);
    const next = REQUIREMENT_OPTIONS.find(
        (o) => o.value !== AUTOMATIC && !used.includes(o.value)
    );
    if (!next) return rule;
    return { ...rule, requirements: [...rule.requirements, emptyRequirement(next.value)] };
}

export function removeRequirementFrom(rule, reqIndex) {
    const requirements = rule.requirements.filter((_r, i) => i !== reqIndex);
    // Never leave a rule with zero requirements — the API rejects it.
    return { ...rule, requirements: requirements.length ? requirements : [emptyRequirement()] };
}

export function setRequirementField(rule, reqIndex, field, value) {
    const requirements = rule.requirements.map((requirement, i) => {
        if (i !== reqIndex) return requirement;
        const updated = { ...requirement, [field]: value };
        // Threshold belongs to min_biweekly_hours alone; drop it on any other type.
        if (field === "type" && value !== "min_biweekly_hours") updated.minBiweeklyHours = "";
        return updated;
    });
    return { ...rule, requirements };
}

// ─────────────────────────────────────────────────────────────────────────────
// API ⇄ form mapping
// ─────────────────────────────────────────────────────────────────────────────

const hoursToInput = (value) => (value != null ? String(value) : "");

/**
 * API rule → form rule. Also accepts the pre-stacking shape
 * ({ qualification, minBiweeklyHours }) so a holiday that predates the
 * migration still opens and can be re-saved in the current shape.
 */
export function apiRuleToForm(rule) {
    const stacked = Array.isArray(rule.requirements) && rule.requirements.length > 0;
    const requirements = stacked
        ? rule.requirements.map((r) => ({
              type:             r.type,
              minBiweeklyHours: hoursToInput(r.minBiweeklyHours),
          }))
        : [
              rule.qualification
                  ? { type: rule.qualification, minBiweeklyHours: hoursToInput(rule.minBiweeklyHours) }
                  : emptyRequirement(),
          ];

    return {
        employmentStatus: rule.employmentStatus,
        match:            rule.match === "any" ? "any" : "all",
        requirements,
    };
}

export const rulesToFormValues = (rules) => (rules ?? []).map(apiRuleToForm);

/** Form rules → API payload (drops empty thresholds, casts the rest to numbers). */
export const rulesToPayload = (rules) =>
    (rules ?? []).map((rule) => ({
        employmentStatus: rule.employmentStatus,
        match:            rule.match,
        requirements:     rule.requirements.map((requirement) => {
            const entry = { type: requirement.type };
            if (requirement.type === "min_biweekly_hours") {
                entry.minBiweeklyHours = Number(requirement.minBiweeklyHours);
            }
            return entry;
        }),
    }));

// ─────────────────────────────────────────────────────────────────────────────
// Validation
// ─────────────────────────────────────────────────────────────────────────────

export const caregiverRulesSchema = yup
    .array()
    .of(
        yup.object({
            employmentStatus: yup.string().required("Select an employment type."),
            match:            yup.string().oneOf(["all", "any"]).required(),
            requirements:     yup
                .array()
                .of(
                    yup.object({
                        type:             yup.string().required("Select a requirement."),
                        minBiweeklyHours: yup
                            .number()
                            .transform((_v, o) => (o === "" ? null : +o))
                            .nullable()
                            .when("type", {
                                is: "min_biweekly_hours",
                                then: (s) =>
                                    s
                                        .typeError("Enter a valid hour threshold.")
                                        .moreThan(0, "Enter a valid hour threshold.")
                                        .required("Enter a valid hour threshold."),
                                otherwise: (s) => s.nullable().optional(),
                            }),
                    })
                )
                .min(1, "Add at least one requirement.")
                .test(
                    "unique-requirement-type",
                    "Each requirement must be a different type.",
                    (requirements) =>
                        new Set((requirements ?? []).map((r) => r.type)).size ===
                        (requirements ?? []).length
                )
                .test(
                    "automatic-not-stacked",
                    "“Automatic” always qualifies, so it cannot be combined with other requirements.",
                    (requirements) =>
                        (requirements ?? []).length <= 1 ||
                        !(requirements ?? []).some((r) => r.type === AUTOMATIC)
                ),
        })
    )
    .optional();

/** Nested react-hook-form errors → the flat keys CaregiverRulesSection reads. */
export function mapRuleErrors(caregiverRulesErrors) {
    const flat = {};
    (caregiverRulesErrors ?? []).forEach((ruleErr, i) => {
        if (ruleErr?.employmentStatus) flat[`rule_${i}_type`] = ruleErr.employmentStatus.message;
        if (ruleErr?.requirements?.message) {
            flat[`rule_${i}_requirements`] = ruleErr.requirements.message;
        }
        (ruleErr?.requirements ?? []).forEach((reqErr, j) => {
            if (reqErr?.minBiweeklyHours) {
                flat[`rule_${i}_req_${j}_hours`] = reqErr.minBiweeklyHours.message;
            }
            if (reqErr?.type) flat[`rule_${i}_req_${j}_type`] = reqErr.type.message;
        });
    });
    return flat;
}
