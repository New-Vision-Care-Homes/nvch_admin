"use client";

// ============================================================
// IMPORTS
// ============================================================

import { useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { Undo2, Save, User } from "lucide-react";
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

/**
 * Entry categories accepted by the API with display labels and unit hints.
 * The `unit` drives the Amount field label and live preview.
 */
const CATEGORY_OPTIONS = [
    { value: "retro_bonus", label: "Retro Bonus", unit: "dollars" },
    { value: "bereavement", label: "Bereavement", unit: "hours"   },
];

const CURRENT_YEAR   = new Date().getFullYear();
const YEAR_OPTIONS   = [CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1];
const PERIOD_OPTIONS = Array.from({ length: 26 }, (_, index) => index + 1);


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
 * Feedback messages (success / error) appear above the two-column body.
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


    // ── Form state ────────────────────────────────────────────────────────────
    const [category,       setCategory]       = useState(CATEGORY_OPTIONS[0].value);
    const [amount,         setAmount]         = useState("");
    const [selectedYear,   setSelectedYear]   = useState(payYear);
    const [selectedPeriod, setSelectedPeriod] = useState(periodNumber);
    const [reason,         setReason]         = useState("");
    const [note,           setNote]           = useState("");
    const [selectedHomeId, setSelectedHomeId] = useState("");


    // ── Data ──────────────────────────────────────────────────────────────────
    const { homes, isLoading: homesLoading } = useHomes({ params: { limit: 100 } });

    // Caregiver summary — React Query returns cached data from the previous page visit
    const { summary: caregiverSummary } = useCaregiverPayrollSummary({
        params: {
            caregiverId,
            payYear:      payYear      ? Number(payYear)      : undefined,
            periodNumber: periodNumber ? Number(periodNumber) : undefined,
        },
        enabled: !!(caregiverId && payYear && periodNumber),
    });

    const { createEntry, isCreating, createError, createResult, resetCreate } =
        useCreateCaregiverEntry(caregiverId);


    // ── Derived values ────────────────────────────────────────────────────────
    const selectedCategory = CATEGORY_OPTIONS.find((option) => option.value === category);
    const amountUnit       = selectedCategory?.unit ?? "amount";

    const caregiverFullName =
        [caregiverSummary?.caregiver?.firstName, caregiverSummary?.caregiver?.lastName]
            .filter(Boolean)
            .join(" ") || "—";


    // ── Handlers ──────────────────────────────────────────────────────────────

    /** Submit the form, create the entry, then return to the caregiver summary page. */
    const handleSubmit = async (event) => {
        event.preventDefault();
        resetCreate();

        await createEntry({
            category,
            amount:       Number(amount),
            payYear:      Number(selectedYear),
            periodNumber: Number(selectedPeriod),
            reason,
            ...(note           && { note }),
            ...(selectedHomeId && { homeId: selectedHomeId }),
        });

        router.push(
            `/payroll/caregivers/${caregiverId}?payYear=${selectedYear}&periodNumber=${selectedPeriod}`
        );
    };

    /** Navigate back to the caregiver summary page. */
    const handleBack = () => {
        router.push(
            `/payroll/caregivers/${caregiverId}?payYear=${selectedYear}&periodNumber=${selectedPeriod}`
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
                        icon={<Save size={15} />}
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
            <form id="addEntryForm" onSubmit={handleSubmit}>
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
                                        value={category}
                                        onChange={(e) => setCategory(e.target.value)}
                                        required
                                    >
                                        {CATEGORY_OPTIONS.map((option) => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Amount */}
                                <div className={styles.fieldGroup}>
                                    <label className={styles.fieldLabel}>
                                        Amount ({amountUnit}) <span className={styles.required}>*</span>
                                    </label>
                                    <input
                                        className={styles.input}
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        placeholder={amountUnit === "dollars" ? "e.g. 500" : "e.g. 8"}
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        required
                                    />
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
                                        value={reason}
                                        onChange={(e) => setReason(e.target.value)}
                                        required
                                    />
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
                                        value={note}
                                        onChange={(e) => setNote(e.target.value)}
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
                                            value={selectedYear}
                                            onChange={(e) => setSelectedYear(e.target.value)}
                                            required
                                        >
                                            <option value="">Select year…</option>
                                            {YEAR_OPTIONS.map((year) => (
                                                <option key={year} value={year}>{year}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className={styles.fieldGroup}>
                                        <label className={styles.fieldLabel}>
                                            Period <span className={styles.required}>*</span>
                                        </label>
                                        <select
                                            className={styles.select}
                                            value={selectedPeriod}
                                            onChange={(e) => setSelectedPeriod(e.target.value)}
                                            required
                                        >
                                            <option value="">Select period…</option>
                                            {PERIOD_OPTIONS.map((period) => (
                                                <option key={period} value={period}>Period {period}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Home attribution */}
                        <Card>
                            <CardHeader>Home Attribution <span className={styles.optional}>(optional)</span></CardHeader>
                            <CardContent>
                                <div className={styles.fieldGroup}>
                                    <select
                                        className={styles.select}
                                        value={selectedHomeId}
                                        onChange={(e) => setSelectedHomeId(e.target.value)}
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
                                        {amount ? `${amount} ${amountUnit}` : `— ${amountUnit}`}
                                        {selectedYear && selectedPeriod
                                            ? ` · Period ${selectedPeriod} · ${selectedYear}`
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
