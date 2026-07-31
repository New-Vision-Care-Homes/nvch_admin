"use client";

import { useEffect }               from "react";
import { useParams, useRouter }    from "next/navigation";
import { useForm, useFieldArray }  from "react-hook-form";
import { yupResolver }             from "@hookform/resolvers/yup";
import * as yup                    from "yup";
import PageLayout                  from "@components/layout/PageLayout";
import ErrorState                  from "@components/UI/ErrorState";
import Button                      from "@components/UI/Button";
import { useHolidays }             from "@/hooks/useHolidays";
import { ADMIN_LEVEL_OPTIONS }     from "@/utils/dropdownList/adminLevel";
import { AlertCircle, Loader }     from "lucide-react";
import CaregiverRulesSection, { EMPLOYMENT_STATUS_OPTIONS } from "../../_components/CaregiverRulesSection";
import styles from "./edit.module.css";

// ─────────────────────────────────────────────────────────────────────────────
// Schema
// ─────────────────────────────────────────────────────────────────────────────

const schema = yup.object({
    name:                  yup.string().trim().required("Holiday name is required."),
    date:                  yup.string().required("Date is required."),
    grantHours:            yup.number()
                              .transform((_v, o) => (o === "" ? null : +o))
                              .nullable()
                              .when("proratedToWorkedHours", {
                                  is: false,
                                  then:      (s) => s.typeError("Enter a valid number of grant hours.").moreThan(0, "Enter a valid number of grant hours.").required("Enter a valid number of grant hours."),
                                  otherwise: (s) => s.nullable().optional(),
                              }),
    proratedToWorkedHours: yup.boolean().optional(),
    adminLevels:           yup.array().of(yup.string()).optional(),
    isActive:              yup.boolean().optional(),
    caregiverRules:        yup.array().of(
        yup.object({
            employmentStatus: yup.string().required("Select an employment type."),
            qualification:    yup.string().required(),
            minBiweeklyHours: yup.number()
                                  .transform((_v, o) => (o === "" ? null : +o))
                                  .nullable()
                                  .when("qualification", {
                                      is: "min_biweekly_hours",
                                      then:      (s) => s.typeError("Enter a valid hour threshold.").moreThan(0, "Enter a valid hour threshold.").required("Enter a valid hour threshold."),
                                      otherwise: (s) => s.nullable().optional(),
                                  }),
        })
    ).optional(),
}).test(
    "holiday-has-target",
    "At least one admin level or caregiver rule must be eligible for this holiday.",
    function(value) {
        const hasAdminLevels    = value.adminLevels?.length > 0;
        const hasCaregiverRules = value.caregiverRules?.length > 0;
        if (!hasAdminLevels && !hasCaregiverRules) {
            return this.createError({
                path:    "_targetError",
                message: "At least one admin level or caregiver rule must be eligible for this holiday.",
            });
        }
        return true;
    }
);

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default function EditHolidayPage() {
    const { id } = useParams();
    const router  = useRouter();

    const { holiday, isLoading, fetchError, refetch, updateHoliday, isActionPending, actionError } =
        useHolidays(id);

    const { register, handleSubmit, watch, setValue, control, reset, formState: { errors } } = useForm({
        resolver: yupResolver(schema),
        defaultValues: {
            name:                  "",
            date:                  "",
            grantHours:            12,
            proratedToWorkedHours: false,
            adminLevels:           [],
            isActive:              true,
            caregiverRules:        [],
        },
    });

    const { fields, append, remove, update } = useFieldArray({ control, name: "caregiverRules" });

    // Seed form when holiday data loads
    useEffect(() => {
        if (holiday) {
            reset({
                name:                  holiday.name,
                date:                  holiday.date,
                grantHours:            holiday.grantHours ?? 12,
                proratedToWorkedHours: holiday.proratedToWorkedHours,
                adminLevels:           [...(holiday.adminLevels ?? [])],
                isActive:              holiday.isActive,
                caregiverRules:        (holiday.caregiverRules ?? []).map((rule) => ({
                    employmentStatus: rule.employmentStatus,
                    qualification:    rule.qualification,
                    minBiweeklyHours: rule.minBiweeklyHours != null ? String(rule.minBiweeklyHours) : "",
                })),
            });
        }
    }, [holiday, reset]);

    const proratedToWorkedHours = watch("proratedToWorkedHours");
    const isActive              = watch("isActive");
    const adminLevels           = watch("adminLevels") ?? [];

    // ── Rule helpers ───────────────────────────────────────────────────────────
    const usedTypes      = fields.map((r) => r.employmentStatus).filter(Boolean);
    const availableTypes = EMPLOYMENT_STATUS_OPTIONS.filter((o) => !usedTypes.includes(o.value));
    const canAddRule     = availableTypes.length > 0;

    const addRule = () => {
        if (!canAddRule) return;
        append({ employmentStatus: availableTypes[0].value, qualification: "automatic", minBiweeklyHours: "" });
    };
    const removeRule = (index) => remove(index);
    const updateRule = (index, field, value) => {
        const { id: _id, ...current } = fields[index];
        const updated = { ...current, [field]: value };
        if (field === "qualification" && value !== "min_biweekly_hours") updated.minBiweeklyHours = "";
        update(index, updated);
    };

    const toggleAdminLevel = (level) =>
        setValue("adminLevels", adminLevels.includes(level)
            ? adminLevels.filter((l) => l !== level)
            : [...adminLevels, level]
        );

    // Map nested rule errors to the flat format CaregiverRulesSection expects
    const ruleErrors = {};
    (errors.caregiverRules ?? []).forEach((ruleErr, i) => {
        if (ruleErr?.employmentStatus) ruleErrors[`rule_${i}_type`]  = ruleErr.employmentStatus.message;
        if (ruleErr?.minBiweeklyHours) ruleErrors[`rule_${i}_hours`] = ruleErr.minBiweeklyHours.message;
    });

    // ── Submit ─────────────────────────────────────────────────────────────────
    const onSubmit = (data) => {
        const payload = {
            name:                  data.name.trim(),
            date:                  data.date,
            proratedToWorkedHours: data.proratedToWorkedHours,
            adminLevels:           data.adminLevels,
            isActive:              data.isActive,
            caregiverRules:        data.caregiverRules.map((rule) => {
                const entry = { employmentStatus: rule.employmentStatus, qualification: rule.qualification };
                if (rule.qualification === "min_biweekly_hours") entry.minBiweeklyHours = Number(rule.minBiweeklyHours);
                return entry;
            }),
        };
        if (!data.proratedToWorkedHours) payload.grantHours = Number(data.grantHours) || 12;
        updateHoliday({ id, body: payload }, {
            onSuccess: () => router.push(`/holidays/${id}`),
        });
    };

    // ── Render ─────────────────────────────────────────────────────────────────
    return (
        <PageLayout>

            <ErrorState isLoading={isLoading} errorMessage={fetchError} onRetry={refetch} />

            {!isLoading && !fetchError && (
                <div className={styles.pageContainer}>

                    {/* ── Header ──────────────────────────────────────────────── */}
                    <div className={styles.pageHeader}>
                        <h1>Edit Holiday</h1>
                        <div className={styles.headerActions}>
                            <Button
                                variant="secondary"
                                onClick={() => router.push(`/holidays/${id}`)}
                                disabled={isActionPending}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="primary"
                                icon={isActionPending ? <Loader size={14} className={styles.spin} /> : null}
                                onClick={handleSubmit(onSubmit)}
                                disabled={isActionPending}
                            >
                                {isActionPending ? "Saving…" : "Save"}
                            </Button>
                        </div>
                    </div>

                    {actionError && (
                        <div className={styles.errorBanner}>
                            <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                            {actionError}
                        </div>
                    )}

                    {/* ── Form card ────────────────────────────────────────────── */}
                    <div className={styles.formCard}>

                        {/* Section 1: Basic Info */}
                        <div className={styles.section}>
                            <p className={styles.sectionTitle}>Basic Info</p>

                            <div className={styles.fieldGrid}>
                                <div className={styles.fieldRow}>
                                    <label className={styles.fieldLabel}>
                                        Name <span className={styles.fieldRequired}>*</span>
                                    </label>
                                    <input
                                        className={`${styles.fieldInput} ${errors.name ? styles.fieldInputError : ""}`}
                                        type="text"
                                        disabled={isActionPending}
                                        {...register("name")}
                                    />
                                    {errors.name && <span className={styles.fieldError}>{errors.name.message}</span>}
                                </div>

                                <div className={styles.fieldRow}>
                                    <label className={styles.fieldLabel}>
                                        Date <span className={styles.fieldRequired}>*</span>
                                    </label>
                                    <input
                                        className={`${styles.fieldInput} ${errors.date ? styles.fieldInputError : ""}`}
                                        type="date"
                                        disabled={isActionPending}
                                        {...register("date")}
                                    />
                                    {errors.date && <span className={styles.fieldError}>{errors.date.message}</span>}
                                </div>
                            </div>

                            <div className={styles.toggleRow}>
                                <div className={styles.toggleInfo}>
                                    <span className={styles.toggleLabel}>Active</span>
                                    <span className={styles.toggleDesc}>
                                        Inactive holidays are excluded from stat-pay computation.
                                    </span>
                                </div>
                                <label className={styles.toggle}>
                                    <input
                                        type="checkbox"
                                        checked={isActive}
                                        onChange={(e) => setValue("isActive", e.target.checked)}
                                        disabled={isActionPending}
                                    />
                                    <span className={styles.toggleSlider} />
                                </label>
                            </div>
                        </div>

                        {/* Section 2: Grant Configuration */}
                        <div className={styles.section}>
                            <p className={styles.sectionTitle}>Grant Configuration</p>

                            <div className={styles.toggleRow}>
                                <div className={styles.toggleInfo}>
                                    <span className={styles.toggleLabel}>Prorated to Worked Hours</span>
                                    <span className={styles.toggleDesc}>
                                        Pay only the hours actually worked that day. When on, fixed grant hours are ignored.
                                    </span>
                                </div>
                                <label className={styles.toggle}>
                                    <input
                                        type="checkbox"
                                        checked={proratedToWorkedHours}
                                        onChange={(e) => setValue("proratedToWorkedHours", e.target.checked)}
                                        disabled={isActionPending}
                                    />
                                    <span className={styles.toggleSlider} />
                                </label>
                            </div>

                            {!proratedToWorkedHours && (
                                <div className={styles.fieldRow}>
                                    <label className={styles.fieldLabel}>
                                        Grant Hours <span className={styles.fieldRequired}>*</span>
                                    </label>
                                    <input
                                        className={`${styles.fieldInput} ${errors.grantHours ? styles.fieldInputError : ""}`}
                                        type="number"
                                        min="0"
                                        step="0.5"
                                        disabled={isActionPending}
                                        style={{ maxWidth: 180 }}
                                        {...register("grantHours")}
                                    />
                                    {errors.grantHours && <span className={styles.fieldError}>{errors.grantHours.message}</span>}
                                </div>
                            )}
                        </div>

                        {/* Section 3: Admin Levels */}
                        <div className={styles.section}>
                            <p className={styles.sectionTitle}>Admin Levels (optional)</p>
                            <div className={styles.checkboxGrid}>
                                {ADMIN_LEVEL_OPTIONS.map((option) => {
                                    const checked = adminLevels.includes(option.value);
                                    return (
                                        <label
                                            key={option.value}
                                            className={`${styles.checkboxLabel} ${checked ? styles.checkboxLabelChecked : ""}`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={checked}
                                                onChange={() => toggleAdminLevel(option.value)}
                                                disabled={isActionPending}
                                            />
                                            {option.label}
                                        </label>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Cross-field: admin levels + caregiver rules combined */}
                        {errors._targetError && (
                            <div className={styles.errorBanner}>
                                <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                                {errors._targetError.message}
                            </div>
                        )}

                        {/* Section 4: Caregiver Rules */}
                        <div className={styles.section}>
                            <CaregiverRulesSection
                                rules={fields}
                                errors={ruleErrors}
                                usedTypes={usedTypes}
                                canAddRule={canAddRule}
                                addRule={addRule}
                                removeRule={removeRule}
                                updateRule={updateRule}
                                isActionPending={isActionPending}
                            />
                        </div>

                    </div>
                </div>
            )}

        </PageLayout>
    );
}
