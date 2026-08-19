"use client";

// ============================================================
// IMPORTS
// ============================================================

import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { Undo2, User } from "lucide-react";
import PageLayout    from "@components/layout/PageLayout";
import Button        from "@components/UI/Button";
import ActionMessage from "@components/UI/ActionMessage";
import { Card, CardHeader, CardContent } from "@components/UI/Card";
import { useCreateCaregiverEntry, useCaregiverPayrollSummary } from "@/hooks/usePayroll";
import { useHomes }  from "@/hooks/useHomes";
import styles        from "./add_entry.module.css";
import detailStyles  from "../../../[id]/payroll_detail.module.css";


// ============================================================
// SECTION: Constants
// ============================================================

const CATEGORY_OPTIONS = [
    { value: "retro_bonus",  label: "Retro Bonus",             unit: "dollars" },
    { value: "bereavement",  label: "Bereavement",             unit: "hours"   },
    { value: "hours_banked", label: "Banked Hours Correction", unit: "hours"   },
];

const CURRENT_YEAR   = new Date().getFullYear();
const YEAR_OPTIONS   = [CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1];
const PERIOD_OPTIONS = Array.from({ length: 26 }, (_, index) => index + 1);


// ============================================================
// SECTION: Validation schema
// ============================================================

const schema = yup.object({
    category: yup
        .string()
        .oneOf(CATEGORY_OPTIONS.map((o) => o.value), "Invalid category")
        .required("Category is required"),

    amount: yup
        .number()
        .typeError("Amount must be a number")
        .required("Amount is required")
        .when("category", {
            is:        "hours_banked",
            then:      (s) => s.notOneOf([0], "Amount cannot be zero"),
            otherwise: (s) => s.positive("Amount must be greater than zero"),
        }),

    payYear: yup
        .number()
        .typeError("Year is required")
        .required("Year is required"),

    periodNumber: yup
        .number()
        .typeError("Period is required")
        .required("Period is required"),

    reason: yup
        .string()
        .trim()
        .required("Reason is required"),

    note:   yup.string().optional(),
    homeId: yup.string().optional(),
});


// ============================================================
// SECTION: Page Component — AddCaregiverEntryPage
// ============================================================

/**
 * AddCaregiverEntryPage
 *
 * Two-column layout for creating a manual payroll entry.
 *   Left column  — form fields: category, amount, reason, note, submit button.
 *   Right column — context panel: caregiver card (cached), pay period selectors,
 *                  home attribution select, live preview chip.
 *
 * Route: /payroll/caregivers/[id]/add_entry
 * Query params: payYear, periodNumber (pre-fill selectors; user can change)
 */
export default function AddCaregiverEntryPage() {

    // ── Routing ───────────────────────────────────────────────────────────────
    const router       = useRouter();
    const params       = useParams();
    const searchParams = useSearchParams();

    const caregiverId  = params.id;
    const payYear      = searchParams.get("payYear")      ?? "";
    const periodNumber = searchParams.get("periodNumber") ?? "";


    // ── Form ──────────────────────────────────────────────────────────────────
    const {
        register,
        handleSubmit,
        watch,
        formState: { errors },
    } = useForm({
        resolver: yupResolver(schema),
        defaultValues: {
            category:     CATEGORY_OPTIONS[0].value,
            amount:       "",
            payYear:      payYear      ? Number(payYear)      : "",
            periodNumber: periodNumber ? Number(periodNumber) : "",
            reason:       "",
            note:         "",
            homeId:       "",
        },
    });

    const watchedCategory = watch("category");
    const watchedYear     = watch("payYear");
    const watchedPeriod   = watch("periodNumber");
    const watchedAmount   = watch("amount");

    const selectedCategory = CATEGORY_OPTIONS.find((o) => o.value === watchedCategory);
    const amountUnit       = selectedCategory?.unit ?? "amount";
    const isBankedHours    = watchedCategory === "hours_banked";


    // ── Data ──────────────────────────────────────────────────────────────────
    const { homes, isLoading: homesLoading } = useHomes({ limit: 100 });

    const { summary: caregiverSummary } = useCaregiverPayrollSummary({
        params: {
            caregiverId,
            payYear:      payYear      ? Number(payYear)      : undefined,
            periodNumber: periodNumber ? Number(periodNumber) : undefined,
        },
        enabled: !!(caregiverId && payYear && periodNumber),
    });

    const { createEntry, isCreating, createError, resetCreate } =
        useCreateCaregiverEntry(caregiverId);


    // ── Derived values ────────────────────────────────────────────────────────
    const caregiverFullName =
        [caregiverSummary?.caregiver?.firstName, caregiverSummary?.caregiver?.lastName]
            .filter(Boolean)
            .join(" ") || "—";


    // ── Handlers ──────────────────────────────────────────────────────────────
    const onSubmit = async (data) => {
        resetCreate();
        try {
            await createEntry({
                category:     data.category,
                amount:       data.amount,
                payYear:      data.payYear,
                periodNumber: data.periodNumber,
                reason:       data.reason,
                ...(data.note   && { note:   data.note }),
                ...(data.homeId && { homeId: data.homeId }),
            });
            router.push(
                `/payroll/caregivers/${caregiverId}?payYear=${data.payYear}&periodNumber=${data.periodNumber}`
            );
        } catch {
            // createError is surfaced via the hook's state
        }
    };

    const handleBack = () => {
        router.push(
            `/payroll/caregivers/${caregiverId}?payYear=${watchedYear}&periodNumber=${watchedPeriod}`
        );
    };


    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <PageLayout>

            {/* ── Page header ─────────────────────────────────────────────── */}
            <div className={detailStyles.pageHeader}>
                <h1>Add Manual Entry</h1>
                <div className={detailStyles.headerActions}>
                    <Button
                        type="submit"
                        form="addEntryForm"
                        disabled={isCreating}
                    >
                        {isCreating ? "Saving…" : "Save Entry"}
                    </Button>
                    <Button
                        variant="secondary"
                        icon={<Undo2 size={15} />}
                        onClick={handleBack}
                    >
                        Back
                    </Button>
                </div>
            </div>

            {/* ── Error feedback ───────────────────────────────────────────── */}
            {createError && (
                <ActionMessage variant="error" message={createError} />
            )}

            {/* ── Two-column body ──────────────────────────────────────────── */}
            <form id="addEntryForm" onSubmit={handleSubmit(onSubmit)}>
                <div className={styles.pageBody}>

                    {/* ── Left column: entry details form ───────────────── */}
                    <Card>
                        <CardHeader>Entry Details</CardHeader>
                        <CardContent>
                            <div className={styles.form}>

                                {/* Category */}
                                <div className={styles.fieldGroup}>
                                    <label className={styles.fieldLabel}>
                                        Category <span className={styles.required}>*</span>
                                    </label>
                                    <select
                                        className={styles.select}
                                        {...register("category")}
                                    >
                                        {CATEGORY_OPTIONS.map((opt) => (
                                            <option key={opt.value} value={opt.value}>
                                                {opt.label}
                                            </option>
                                        ))}
                                    </select>
                                    {errors.category && (
                                        <p className={styles.fieldError}>{errors.category.message}</p>
                                    )}
                                </div>

                                {/* Amount */}
                                <div className={styles.fieldGroup}>
                                    <label className={styles.fieldLabel}>
                                        Amount ({amountUnit}) <span className={styles.required}>*</span>
                                    </label>
                                    <input
                                        className={styles.input}
                                        type="number"
                                        step="0.01"
                                        placeholder={isBankedHours
                                            ? "e.g. 8 or -8"
                                            : amountUnit === "dollars" ? "e.g. 500" : "e.g. 8"
                                        }
                                        {...register("amount", { valueAsNumber: true })}
                                    />
                                    {isBankedHours && (
                                        <p className={styles.fieldHint}>
                                            Positive adds hours to the balance; negative removes them. Zero is not allowed.
                                        </p>
                                    )}
                                    {errors.amount && (
                                        <p className={styles.fieldError}>{errors.amount.message}</p>
                                    )}
                                </div>

                                {/* Reason */}
                                <div className={styles.fieldGroup}>
                                    <label className={styles.fieldLabel}>
                                        Reason <span className={styles.required}>*</span>
                                    </label>
                                    <input
                                        className={styles.input}
                                        type="text"
                                        placeholder="e.g. Q2 retention bonus"
                                        {...register("reason")}
                                    />
                                    {errors.reason && (
                                        <p className={styles.fieldError}>{errors.reason.message}</p>
                                    )}
                                </div>

                                {/* Note */}
                                <div className={styles.fieldGroup}>
                                    <label className={styles.fieldLabel}>
                                        Note <span className={styles.optional}>(optional)</span>
                                    </label>
                                    <textarea
                                        className={styles.textarea}
                                        rows={3}
                                        placeholder="Shown in cover-sheet notes…"
                                        {...register("note")}
                                    />
                                </div>

                            </div>
                        </CardContent>
                    </Card>

                    {/* ── Right column: context panel ───────────────────── */}
                    <div className={styles.sideColumn}>

                        {/* Caregiver card */}
                        <Card>
                            <CardHeader>Caregiver</CardHeader>
                            <CardContent>
                                <div className={styles.caregiverRow}>
                                    <User size={20} style={{ color: "#1c4a6e", flexShrink: 0 }} />
                                    <div>
                                        <div className={styles.caregiverName}>{caregiverFullName}</div>
                                        <div className={styles.caregiverMeta}>
                                            {caregiverSummary?.caregiver?.employeeId && (
                                                <span>{caregiverSummary.caregiver.employeeId}</span>
                                            )}
                                            {caregiverSummary?.caregiver?.employmentStatus && (
                                                <span style={{ textTransform: "capitalize" }}>
                                                    {" · "}{caregiverSummary.caregiver.employmentStatus}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Pay period selectors */}
                        <Card>
                            <CardHeader>Pay Period</CardHeader>
                            <CardContent>
                                <div className={styles.rowGroup}>
                                    <div className={styles.fieldGroup}>
                                        <label className={styles.fieldLabel}>
                                            Year <span className={styles.required}>*</span>
                                        </label>
                                        <select
                                            className={styles.select}
                                            {...register("payYear", { valueAsNumber: true })}
                                        >
                                            <option value="">Select year…</option>
                                            {YEAR_OPTIONS.map((year) => (
                                                <option key={year} value={year}>{year}</option>
                                            ))}
                                        </select>
                                        {errors.payYear && (
                                            <p className={styles.fieldError}>{errors.payYear.message}</p>
                                        )}
                                    </div>
                                    <div className={styles.fieldGroup}>
                                        <label className={styles.fieldLabel}>
                                            Period <span className={styles.required}>*</span>
                                        </label>
                                        <select
                                            className={styles.select}
                                            {...register("periodNumber", { valueAsNumber: true })}
                                        >
                                            <option value="">Select period…</option>
                                            {PERIOD_OPTIONS.map((period) => (
                                                <option key={period} value={period}>Period {period}</option>
                                            ))}
                                        </select>
                                        {errors.periodNumber && (
                                            <p className={styles.fieldError}>{errors.periodNumber.message}</p>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Home attribution */}
                        <Card>
                            <CardHeader>
                                Home Attribution <span className={styles.optional}>(optional)</span>
                            </CardHeader>
                            <CardContent>
                                <div className={styles.fieldGroup}>
                                    <select
                                        className={styles.select}
                                        {...register("homeId")}
                                    >
                                        <option value="">
                                            {homesLoading ? "Loading homes…" : "No specific home"}
                                        </option>
                                        {homes.map((home) => (
                                            <option key={home.id} value={home.id}>{home.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Live preview chip */}
                        <Card>
                            <CardHeader>Preview</CardHeader>
                            <CardContent>
                                <div className={styles.previewChip}>
                                    <div className={styles.previewCategory}>
                                        {selectedCategory?.label ?? "—"}
                                    </div>
                                    <div className={styles.previewMeta}>
                                        {watchedAmount ? `${watchedAmount} ${amountUnit}` : `— ${amountUnit}`}
                                        {watchedYear && watchedPeriod
                                            ? ` · Period ${watchedPeriod} · ${watchedYear}`
                                            : ""}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                    </div>

                </div>
            </form>

        </PageLayout>
    );
}
