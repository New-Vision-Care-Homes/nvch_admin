"use client";

import { Plus, X } from "lucide-react";
import {
    EMPLOYMENT_STATUS_OPTIONS,
    MATCH_OPTIONS,
    availableRequirementTypes,
    canAddRequirement,
} from "./caregiverRules";
import styles from "./CaregiverRulesSection.module.css";

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
 * One card per employment type; each card stacks one or more requirements
 * combined by the card's match ("all" / "any"), so a single type can be held to
 * e.g. 72 hours AND the 15-of-30 paid-days bracket.
 *
 * @param {object[]} rules             - Current rule array
 * @param {object}   errors            - Errors keyed rule_N_type / rule_N_requirements / rule_N_req_M_hours
 * @param {string[]} usedTypes         - Employment statuses already present in rules
 * @param {boolean}  canAddRule        - Whether another employment type can be added
 * @param {Function} addRule           - Add a new rule
 * @param {Function} removeRule        - Remove rule at index
 * @param {Function} updateRule        - (index, field, value) on the rule itself
 * @param {Function} addRequirement    - (ruleIndex)
 * @param {Function} removeRequirement - (ruleIndex, reqIndex)
 * @param {Function} updateRequirement - (ruleIndex, reqIndex, field, value)
 * @param {boolean}  isActionPending   - Disable controls during submit
 */
export default function CaregiverRulesSection({
    rules,
    errors,
    usedTypes,
    canAddRule,
    addRule,
    removeRule,
    updateRule,
    addRequirement,
    removeRequirement,
    updateRequirement,
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
                        const requirements = rule.requirements ?? [];
                        const isStacked    = requirements.length > 1;
                        const canStackMore = canAddRequirement(rule);

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

                                <div className={styles.ruleRow}>
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

                                    {/* A combinator only means something once there are two requirements. */}
                                    {isStacked && (
                                        <div className={styles.fieldRow}>
                                            <label className={styles.fieldLabel}>Combine With</label>
                                            <select
                                                className={styles.fieldInput}
                                                value={rule.match}
                                                onChange={(e) => updateRule(index, "match", e.target.value)}
                                                disabled={isActionPending}
                                            >
                                                {MATCH_OPTIONS.map((o) => (
                                                    <option key={o.value} value={o.value}>{o.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                </div>

                                <div className={styles.requirementsBlock}>
                                    <span className={styles.requirementsLabel}>
                                        Requirements
                                        {isStacked && (
                                            <span className={styles.requirementsHint}>
                                                {rule.match === "any"
                                                    ? " — any one of these qualifies"
                                                    : " — all of these must be met"}
                                            </span>
                                        )}
                                    </span>

                                    {requirements.map((requirement, reqIndex) => {
                                        const showMinHours = requirement.type === "min_biweekly_hours";
                                        const hoursError   = errors[`rule_${index}_req_${reqIndex}_hours`];

                                        return (
                                            <div key={reqIndex} className={styles.requirementRow}>
                                                <div className={showMinHours ? styles.requirementFields : styles.requirementFieldsSingle}>
                                                    <div className={styles.fieldRow}>
                                                        <select
                                                            className={styles.fieldInput}
                                                            value={requirement.type}
                                                            onChange={(e) => updateRequirement(index, reqIndex, "type", e.target.value)}
                                                            disabled={isActionPending}
                                                        >
                                                            {availableRequirementTypes(rule, reqIndex).map((o) => (
                                                                <option key={o.value} value={o.value}>{o.label}</option>
                                                            ))}
                                                        </select>
                                                    </div>

                                                    {showMinHours && (
                                                        <div className={styles.fieldRow}>
                                                            <input
                                                                className={`${styles.fieldInput} ${hoursError ? styles.fieldInputError : ""}`}
                                                                type="number"
                                                                min="1"
                                                                step="1"
                                                                placeholder="Min hours, e.g. 72"
                                                                value={requirement.minBiweeklyHours}
                                                                onChange={(e) => updateRequirement(index, reqIndex, "minBiweeklyHours", e.target.value)}
                                                                disabled={isActionPending}
                                                            />
                                                            {hoursError && (
                                                                <span className={styles.fieldError}>{hoursError}</span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>

                                                <button
                                                    className={styles.requirementRemoveBtn}
                                                    onClick={() => removeRequirement(index, reqIndex)}
                                                    disabled={isActionPending || requirements.length <= 1}
                                                    title={requirements.length <= 1
                                                        ? "A rule needs at least one requirement"
                                                        : "Remove requirement"}
                                                >
                                                    <X size={13} />
                                                </button>
                                            </div>
                                        );
                                    })}

                                    {errors[`rule_${index}_requirements`] && (
                                        <span className={styles.fieldError}>{errors[`rule_${index}_requirements`]}</span>
                                    )}

                                    <button
                                        className={styles.addRequirementBtn}
                                        onClick={() => addRequirement(index)}
                                        disabled={!canStackMore || isActionPending}
                                        title={canStackMore
                                            ? "Stack another requirement on this employment type"
                                            : "“Automatic” always qualifies, so it cannot be combined with other requirements"}
                                    >
                                        <Plus size={13} />
                                        Add Requirement
                                    </button>
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
