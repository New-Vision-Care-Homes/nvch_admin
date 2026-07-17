"use client";

// ============================================================
// IMPORTS
// ============================================================

import { useParams, useSearchParams, useRouter } from "next/navigation";
import { Undo2, User, ClipboardList }  from "lucide-react";
import PageLayout from "@components/layout/PageLayout";
import ErrorState from "@components/UI/ErrorState";
import Button     from "@components/UI/Button";
import { Card, CardHeader, CardContent } from "@components/UI/Card";
import { useCaregiverPayrollSummary } from "@/hooks/usePayroll";
import { formatDateOnly } from "@/utils/dates";
import styles       from "./caregiver_summary.module.css";
import detailStyles from "../../[id]/payroll_detail.module.css";


// ============================================================
// SECTION: Constants
// ============================================================

/**
 * Hour type definitions for the breakdown grid.
 * `apiKey` corresponds to the camelCase key inside summary.breakdown.
 */
const HOUR_TYPE_DEFINITIONS = [
    { label: "Regular",           apiKey: "regular"          },
    { label: "Overtime",          apiKey: "overtime"         },
    { label: "Other",             apiKey: "other"            },
    { label: "Holiday (Stat)",    apiKey: "statPay"          },
    { label: "Bereavement",       apiKey: "bereavement"      },
    { label: "Banked Hours Paid", apiKey: "bankedHoursPaid"  },
    { label: "Hours Banked",      apiKey: "hoursBanked"      },
];


// ============================================================
// SECTION: Page Component — CaregiverPayrollSummaryPage
// ============================================================

export default function CaregiverPayrollSummaryPage() {

    // ── Routing ───────────────────────────────────────────────────────────────
    const router       = useRouter();
    const params       = useParams();
    const searchParams = useSearchParams();

    const caregiverId  = params.id;
    const payYear      = searchParams.get("payYear");
    const periodNumber = searchParams.get("periodNumber");


    // ── Data ──────────────────────────────────────────────────────────────────
    const { summary, isLoading, fetchError, refetch } = useCaregiverPayrollSummary({
        params: {
            caregiverId,
            payYear:      payYear      ? Number(payYear)      : undefined,
            periodNumber: periodNumber ? Number(periodNumber) : undefined,
        },
        enabled: !!(caregiverId && payYear && periodNumber),
    });


    console.log(summary);
    // ── Derived values ────────────────────────────────────────────────────────
    const caregiverFullName =
        [summary?.caregiver?.firstName, summary?.caregiver?.lastName]
            .filter(Boolean)
            .join(" ") || "—";

    const breakdown = summary?.breakdown ?? {};
    const entries   = summary?.entries   ?? [];
    const period    = summary?.payPeriod ?? {};


    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <PageLayout>

            {/* ── Page header ─────────────────────────────────────────────── */}
            <div className={detailStyles.pageHeader}>
                <h1>Caregiver Payroll Summary</h1>
                <div className={detailStyles.headerActions}>
                    <Button
                        variant="secondary"
                        icon={<Undo2 size={15} />}
                        onClick={() => router.back()}
                    >
                        Back
                    </Button>
                </div>
            </div>

            {/* ── Loading / error ──────────────────────────────────────────── */}
            <ErrorState isLoading={isLoading} errorMessage={fetchError} onRetry={refetch} />

            {!isLoading && !fetchError && (
                <>
                    {/* ── Caregiver info card ──────────────────────────────── */}
                    <div className={styles.caregiverCard}>
                        <User size={22} style={{ color: "var(--color-primary, #1c4a6e)", flexShrink: 0 }} />
                        <div className={styles.caregiverInfo}>
                            <div className={styles.caregiverName}>{caregiverFullName}</div>
                            <div className={styles.caregiverMeta}>
                                {summary?.caregiver?.employeeId && (
                                    <span>{summary.caregiver.employeeId}</span>
                                )}
                                {summary?.caregiver?.employmentStatus && (
                                    <span style={{ textTransform: "capitalize" }}>
                                        {" · "}{summary.caregiver.employmentStatus}
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className={styles.caregiverPeriod}>
                            <span className={styles.caregiverPeriodYear}>
                                {period.payYear ?? payYear ?? "—"}
                            </span>
                            <span className={styles.caregiverPeriodBadge}>
                                Period {period.periodNumber ?? periodNumber ?? "—"}
                            </span>
                        </div>
                    </div>

                    {/* ── Period strip ─────────────────────────────────────── */}
                    <div className={detailStyles.periodStrip}>
                        <div className={detailStyles.periodItem}>
                            <span className={detailStyles.periodItemLabel}>Pay Year</span>
                            <span className={detailStyles.periodItemValue}>{period.payYear ?? payYear ?? "—"}</span>
                        </div>
                        <div className={detailStyles.periodItem}>
                            <span className={detailStyles.periodItemLabel}>Pay Period</span>
                            <span className={detailStyles.periodItemValue}>Period {period.periodNumber ?? periodNumber ?? "—"}</span>
                        </div>
                        {period.periodStart && (
                            <div className={detailStyles.periodItem}>
                                <span className={detailStyles.periodItemLabel}>Start</span>
                                <span className={detailStyles.periodItemValue}>{formatDateOnly(period.periodStart)}</span>
                            </div>
                        )}
                        {period.periodEnd && (
                            <div className={detailStyles.periodItem}>
                                <span className={detailStyles.periodItemLabel}>End</span>
                                <span className={detailStyles.periodItemValue}>{formatDateOnly(period.periodEnd)}</span>
                            </div>
                        )}
                        {summary?.maxHours != null && (
                            <div className={detailStyles.periodItem}>
                                <span className={detailStyles.periodItemLabel}>Max Hours</span>
                                <span className={detailStyles.periodItemValue}>{summary.maxHours}</span>
                            </div>
                        )}
                    </div>

                    {/* ── Hours breakdown card ─────────────────────────────── */}
                    <Card>
                        <CardHeader>Hours Breakdown</CardHeader>
                        <CardContent>
                            <div className={styles.summaryGrid}>
                                {HOUR_TYPE_DEFINITIONS.map(({ label, apiKey }) => (
                                    <div key={apiKey} className={styles.summaryItem}>
                                        <span className={styles.summaryItemLabel}>{label}</span>
                                        <span className={styles.summaryItemValue}>
                                            {breakdown[apiKey] ?? "—"}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* ── Totals card ──────────────────────────────────────── */}
                    <Card>
                        <CardHeader>Period Totals</CardHeader>
                        <CardContent>
                            <div className={styles.summaryGrid}>
                                <div className={styles.summaryItem}>
                                    <span className={styles.summaryItemLabel}>Total Worked Hours</span>
                                    <span className={styles.summaryTotalValue}>
                                        {breakdown.totalWorkedHours ?? "—"}
                                    </span>
                                </div>
                                <div className={styles.summaryItem}>
                                    <span className={styles.summaryItemLabel}>Unresolved Hours</span>
                                    <span className={styles.summaryItemValue} style={breakdown.unresolvedHours > 0 ? { color: "#dc2626" } : {}}>
                                        {breakdown.unresolvedHours ?? "—"}
                                    </span>
                                </div>
                                <div className={styles.summaryItem}>
                                    <span className={styles.summaryItemLabel}>Retro Bonus</span>
                                    <span className={styles.summaryItemValue}>
                                        ${breakdown.retroBonusDollars ?? "—"}
                                    </span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* ── Manual entries card ──────────────────────────────── */}
                    <Card>
                        <CardHeader>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <ClipboardList size={16} />
                                Manual Entries
                                {entries.length > 0 && (
                                    <span className={styles.entriesCount}>{entries.length}</span>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent>
                            {entries.length === 0 ? (
                                <p className={styles.entriesEmpty}>No manual entries for this period.</p>
                            ) : (
                                <div className={styles.entriesList}>
                                    {entries.map((entry, index) => (
                                        <div key={entry.id ?? index} className={styles.entryRow}>
                                            <div className={styles.entryBody}>
                                                {entry.type && (
                                                    <span className={styles.entryType}>{entry.type}</span>
                                                )}
                                                {entry.hours != null && (
                                                    <span className={styles.entryMeta}>{entry.hours} hrs</span>
                                                )}
                                                {entry.date && (
                                                    <span className={styles.entryMeta}>{formatDateOnly(entry.date)}</span>
                                                )}
                                                {entry.note && (
                                                    <span className={styles.entryNote}>{entry.note}</span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </>
            )}

        </PageLayout>
    );
}
