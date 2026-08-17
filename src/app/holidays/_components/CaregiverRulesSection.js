"use client";

import { Plus, X } from "lucide-react";
import styles from "./CaregiverRulesSection.module.css";

// ─────────────────────────────────────────────────────────────────────────────
// Constants — exported so parent pages can compute available types for addRule
// ─────────────────────────────────────────────────────────────────────────────

export const EMPLOYMENT_STATUS_OPTIONS = [
    { value: "full_time", label: "Full-time" },
    { value: "casual",    label: "Casual" },
    { value: "term",      label: "Term" },
];

const QUALIFICATION_OPTIONS = [
    { value: "automatic",          label: "Automatic" },
    { value: "min_biweekly_hours", label: "Min biweekly hours" },
    { value: "paid_days_bracket",  label: "Paid-days bracket (30-day)" },
];

const RULE_CARD_CLASS = {
    full_time: styles.ruleCardFullTime,
    casual:    styles.ruleCardCasual,
    term:      styles.ruleCardTerm,
};

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Shared caregiver rules edit section used by both the create and edit pages.
 *
 * @param {object[]}  rules           - Current rule array
 * @param {object}    errors          - Validation errors keyed by rule_N_type / rule_N_hours
 * @param {string[]}  usedTypes       - Employment statuses already present in rules
 * @param {boolean}   canAddRule      - Whether another rule can be added
 * @param {Function}  addRule         - Add a new rule
 * @param {Function}  removeRule      - Remove rule at index
 * @param {Function}  updateRule      - Update a field on the rule at index
 * @param {boolean}   isActionPending - Disable controls during submit
 */
export default function CaregiverRulesSection({
    rules,
    errors,
    usedTypes,
    canAddRule,
    addRule,
    removeRule,
    updateRule,
    isActionPending,
}) {
    return (
        <>
            <p className={styles.sectionTitle}>Caregiver Rules</p>

            {rules.length > 0 && (
                <div className={styles.rulesList}>
                    {rules.map((rule, index) => {
                        const rowTypeOptions = EMPLOYMENT_STATUS_OPTIONS.filter(
                            (o) => o.value === rule.employmentStatus || !usedTypes.includes(o.value)
                        );
                        const cardClass    = RULE_CARD_CLASS[rule.employmentStatus] ?? styles.ruleCardNew;
                        const showMinHours = rule.qualification === "min_biweekly_hours";

                        return (
                            <div key={index} className={`${styles.ruleCard} ${cardClass}`}>
                                <button
                                    className={styles.ruleRemoveBtn}
                                    onClick={() => removeRule(index)}
                                    disabled={isActionPending}
                                    title="Remove rule"
                                >
                                    <X size={14} />
                                </button>

                                <div className={showMinHours ? styles.ruleRowThree : styles.ruleRow}>
                                    <div className={styles.fieldRow}>
                                        <label className={styles.fieldLabel}>Employment Type</label>
                                        <select
                                            className={`${styles.fieldInput} ${errors[`rule_${index}_type`] ? styles.fieldInputError : ""}`}
                                            value={rule.employmentStatus}
                                            onChange={(e) => updateRule(index, "employmentStatus", e.target.value)}
                                            disabled={isActionPending}
                                        >
                                            {rowTypeOptions.map((o) => (
                                                <option key={o.value} value={o.value}>{o.label}</option>
                                            ))}
                                        </select>
                                        {errors[`rule_${index}_type`] && (
                                            <span className={styles.fieldError}>{errors[`rule_${index}_type`]}</span>
                                        )}
                                    </div>

                                    <div className={styles.fieldRow}>
                                        <label className={styles.fieldLabel}>Qualification</label>
                                        <select
                                            className={styles.fieldInput}
                                            value={rule.qualification}
                                            onChange={(e) => updateRule(index, "qualification", e.target.value)}
                                            disabled={isActionPending}
                                        >
                                            {QUALIFICATION_OPTIONS.map((o) => (
                                                <option key={o.value} value={o.value}>{o.label}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {showMinHours && (
                                        <div className={styles.fieldRow}>
                                            <label className={styles.fieldLabel}>
                                                Min Hours <span className={styles.fieldRequired}>*</span>
                                            </label>
                                            <input
                                                className={`${styles.fieldInput} ${errors[`rule_${index}_hours`] ? styles.fieldInputError : ""}`}
                                                type="number"
                                                min="1"
                                                step="1"
                                                placeholder="e.g. 72"
                                                value={rule.minBiweeklyHours}
                                                onChange={(e) => updateRule(index, "minBiweeklyHours", e.target.value)}
                                                disabled={isActionPending}
                                            />
                                            {errors[`rule_${index}_hours`] && (
                                                <span className={styles.fieldError}>{errors[`rule_${index}_hours`]}</span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <button
                className={styles.addRuleBtn}
                onClick={addRule}
                disabled={!canAddRule || isActionPending}
            >
                <Plus size={14} />
                Add Rule
            </button>
        </>
    );
}
