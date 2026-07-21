"use client";

// ============================================================
// IMPORTS
// ============================================================

import { useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { Undo2, Ban, AlertTriangle } from "lucide-react";
import PageLayout    from "@components/layout/PageLayout";
import ErrorState    from "@components/UI/ErrorState";
import Button        from "@components/UI/Button";
import ActionMessage from "@components/UI/ActionMessage";
import { useCaregiverPayrollSummary, useVoidEntry } from "@/hooks/usePayroll";
import { useProfile }                              from "@/hooks/useProfile";
import { formatDateTime } from "@/utils/dates";
import styles       from "./entry_detail.module.css";
import detailStyles from "../../../../[id]/payroll_detail.module.css";


// ============================================================
// SECTION: Constants
// ============================================================

const CATEGORY_LABELS = {
    retro_bonus: "Retro Bonus",
    bereavement: "Bereavement",
};

const STATUS_LABELS = {
    approved: "Approved",
    pending:  "Pending",
    reversed: "Voided",
};

const formatCategory = (category) => CATEGORY_LABELS[category] ?? category;


// ============================================================
// SECTION: Page Component — EntryDetailPage
// ============================================================

export default function EntryDetailPage() {

    // ── Routing ───────────────────────────────────────────────────────────────
    const router       = useRouter();
    const params       = useParams();
    const searchParams = useSearchParams();

    const caregiverId  = params.id;
    const entryId      = params.entryId;
    const payYear      = searchParams.get("payYear");
    const periodNumber = searchParams.get("periodNumber");


    // ── State ─────────────────────────────────────────────────────────────────
    const [voidModalOpen, setVoidModalOpen] = useState(false);
    const [voidReason,    setVoidReason]    = useState("");


    // ── Permissions ───────────────────────────────────────────────────────────
    const { profile } = useProfile();
    const canManage   = profile?.permissionSlugs?.includes("manage_payroll") ?? false;


    // ── Data ──────────────────────────────────────────────────────────────────
    const { summary, isLoading, fetchError, refetch } = useCaregiverPayrollSummary({
        params: {
            caregiverId,
            payYear:      payYear      ? Number(payYear)      : undefined,
            periodNumber: periodNumber ? Number(periodNumber) : undefined,
        },
        enabled: !!(caregiverId && payYear && periodNumber),
    });

    const entry = summary?.entries?.find((e) => e.id === entryId) ?? null;

    const { voidEntry, isVoiding, voidResult, voidError, resetVoid } =
        useVoidEntry(entryId);


    // ── Derived values ────────────────────────────────────────────────────────
    const createdByName = entry
        ? [entry.createdBy?.firstName, entry.createdBy?.lastName]
              .filter(Boolean).join(" ") || "—"
        : "—";

    const canVoid = canManage && entry?.status === "approved" && !voidResult;


    // ── Handlers ──────────────────────────────────────────────────────────────

    const handleBack = () => {
        router.push(
            `/payroll/caregivers/${caregiverId}?payYear=${payYear}&periodNumber=${periodNumber}`
        );
    };

    const handleVoidOpen = () => {
        setVoidReason("");
        resetVoid();
        setVoidModalOpen(true);
    };

    const handleVoidClose = () => {
        setVoidModalOpen(false);
        setVoidReason("");
        resetVoid();
    };

    const handleVoidSubmit = async (event) => {
        event.preventDefault();
        try {
            await voidEntry({ reason: voidReason });
            setVoidModalOpen(false);
        } catch {
            // voidError is surfaced via the hook's state
        }
    };


    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <PageLayout>

            {/* ── Page header ─────────────────────────────────────────────── */}
            <div className={detailStyles.pageHeader}>
                <h1>Entry Detail</h1>
                <div className={detailStyles.headerActions}>
                    {canVoid && (
                        <button className={styles.voidHeaderBtn} onClick={handleVoidOpen}>
                            <Ban size={14} />
                            Void Entry
                        </button>
                    )}
                    <Button
                        variant="secondary"
                        icon={<Undo2 size={15} />}
                        onClick={handleBack}
                    >
                        Back
                    </Button>
                </div>
            </div>

            {/* ── Loading / error ──────────────────────────────────────────── */}
            <ErrorState isLoading={isLoading} errorMessage={fetchError} onRetry={refetch} />

            {voidResult && (
                <ActionMessage variant="success" message="Entry voided successfully." />
            )}

            {!isLoading && !fetchError && entry && (
                <div className={styles.pageBody}>

                    {/* ── Hero card ─────────────────────────────────────────── */}
                    <div className={styles.heroCard}>
                        <div className={styles.heroLeft}>
                            <p className={styles.heroCategoryLabel}>Amount</p>
                            <p className={styles.heroAmount}>{entry.amount} {entry.unit}</p>
                            <p className={styles.heroCategoryName}>{formatCategory(entry.category)}</p>
                        </div>
                        <span className={`${styles.statusBadge} ${
                            entry.status === "approved" ? styles.statusApproved :
                            entry.status === "pending"  ? styles.statusPending  :
                            entry.status === "reversed" ? styles.statusVoided   : ""
                        }`}>
                            {STATUS_LABELS[entry.status] ?? entry.status}
                        </span>
                    </div>

                    {/* ── Two-column detail section ─────────────────────────── */}
                    <div className={styles.detailColumns}>

                        {/* Left: period + location */}
                        <div className={styles.detailCard}>
                            <p className={styles.detailSectionTitle}>Period &amp; Location</p>
                            <div className={styles.detailFieldList}>
                                <div className={styles.detailField}>
                                    <span className={styles.detailFieldLabel}>Pay Year</span>
                                    <span className={styles.detailFieldValue}>{entry.payYear ?? "—"}</span>
                                </div>
                                <div className={styles.detailField}>
                                    <span className={styles.detailFieldLabel}>Pay Period</span>
                                    <span className={styles.detailFieldValue}>Period {entry.periodNumber ?? "—"}</span>
                                </div>
                                <div className={styles.detailField}>
                                    <span className={styles.detailFieldLabel}>Home</span>
                                    <span className={styles.detailFieldValue}>{entry.home?.name ?? "—"}</span>
                                </div>
                            </div>
                        </div>

                        {/* Right: audit trail */}
                        <div className={styles.detailCard}>
                            <p className={styles.detailSectionTitle}>Audit Trail</p>
                            <div className={styles.detailFieldList}>
                                <div className={styles.detailField}>
                                    <span className={styles.detailFieldLabel}>Created By</span>
                                    <span className={styles.detailFieldValue}>{createdByName}</span>
                                    {entry.createdBy?.role && (
                                        <span className={styles.detailFieldMuted} style={{ textTransform: "capitalize" }}>
                                            {entry.createdBy.role}
                                        </span>
                                    )}
                                </div>
                                <div className={styles.detailField}>
                                    <span className={styles.detailFieldLabel}>Created At</span>
                                    <span className={styles.detailFieldValue}>
                                        {entry.createdAt ? formatDateTime(entry.createdAt) : "—"}
                                    </span>
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* ── Reason ────────────────────────────────────────────── */}
                    <div className={styles.textBlock}>
                        <p className={styles.textBlockLabel}>Reason</p>
                        <p className={styles.textBlockContent}>{entry.reason ?? "—"}</p>
                    </div>

                    {/* ── Note ─────────────────────────────────────────────── */}
                    {entry.note && (
                        <div className={styles.textBlock}>
                            <p className={styles.textBlockLabel}>Note</p>
                            <p className={styles.textBlockContent}>{entry.note}</p>
                        </div>
                    )}

                </div>
            )}

            {/* ── Void modal ───────────────────────────────────────────────── */}
            {voidModalOpen && (
                <div className={styles.modalOverlay} onClick={handleVoidClose}>
                    <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>

                        <div className={styles.modalIcon}>
                            <AlertTriangle size={22} color="#dc2626" />
                        </div>

                        <p className={styles.modalTitle}>Void This Entry</p>
                        <p className={styles.modalSubtitle}>
                            This action cannot be undone. The reason will be saved to the audit trail.
                            {entry?.category === "banked_hours_payout" && (
                                <> The caregiver&apos;s banked-hours balance will be re-credited.</>
                            )}
                        </p>

                        {voidError && (
                            <ActionMessage variant="error" message={voidError} />
                        )}

                        <form onSubmit={handleVoidSubmit}>
                            <label className={styles.modalInputLabel}>
                                Reason <span style={{ color: "#dc2626" }}>*</span>
                            </label>
                            <input
                                className={styles.modalInput}
                                type="text"
                                placeholder="e.g. Entered in error"
                                value={voidReason}
                                onChange={(e) => setVoidReason(e.target.value)}
                                required
                                autoFocus
                            />
                            <div className={styles.modalActions}>
                                <button
                                    type="button"
                                    className={styles.modalCancelBtn}
                                    onClick={handleVoidClose}
                                    disabled={isVoiding}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className={styles.modalConfirmBtn}
                                    disabled={isVoiding || !voidReason.trim()}
                                >
                                    <Ban size={14} />
                                    {isVoiding ? "Voiding…" : "Confirm Void"}
                                </button>
                            </div>
                        </form>

                    </div>
                </div>
            )}

        </PageLayout>
    );
}
