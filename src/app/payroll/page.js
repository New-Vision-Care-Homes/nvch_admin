"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
    Building2, MapPin, Eye,
    AlertTriangle, CheckCircle2, Loader2, RefreshCw, ClipboardList,
} from "lucide-react";
import PageLayout    from "@components/layout/PageLayout";
import ErrorState    from "@components/UI/ErrorState";
import ActionMessage from "@components/UI/ActionMessage";
import Button        from "@components/UI/Button";
import IconButton    from "@components/UI/IconButton";
import { PageTable, PageTableRow, PageTableHeadCell, PageTableCell } from "@components/UI/Table";
import StatusBadge, { ColorPill } from "@components/UI/Badge";
import styles        from "./payroll.module.css";
import { usePayPeriod }                                          from "@/hooks/usePayPeriods";
import { usePayrollOverview, useRecomputeStats, useHouseReviews, useCoverSheet } from "@/hooks/usePayroll";
import { useProfile }                                            from "@/hooks/useProfile";
import { HOME_TYPE_COLORS } from "@/utils/dropdownList/homeType";
import { REGION_COLORS }    from "@/utils/dropdownList/region";
import { COLOR_FALLBACK }   from "@/utils/dropdownList/shared";

// ─── Constants ────────────────────────────────────────────────────────────────

const CURRENT_YEAR   = new Date().getFullYear();
const YEAR_OPTIONS   = [CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1];
const PERIOD_OPTIONS = Array.from({ length: 26 }, (_, i) => i + 1);

// ─── Status tone maps ─────────────────────────────────────────────────────────

const SUPERVISOR_TONE = { pending: "warning", reviewed: "success" };
const PAYROLL_TONE    = { pending: "neutral", processing: "info", processed: "success" };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n) {
    if (n == null) return "—";
    return Number(n).toFixed(2);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function UnresolvedBadge({ unresolvedHours, isLoading }) {
    if (isLoading) {
        return <span className={styles.loadingDots}><Loader2 size={12} className={styles.spin} /></span>;
    }
    if (unresolvedHours == null) return <span>—</span>;
    if (unresolvedHours > 0) {
        return (
            <span className={styles.unresolvedBadge}>
                <AlertTriangle size={11} />
                {unresolvedHours}h
            </span>
        );
    }
    return (
        <span className={styles.resolvedBadge}>
            <CheckCircle2 size={11} />
            Resolved
        </span>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PayrollOverviewPage() {
    const router = useRouter();

    const [selectedYear,    setSelectedYear]    = useState("");
    const [selectedPeriod,  setSelectedPeriod]  = useState("");
    const [defaultsApplied, setDefaultsApplied] = useState(false);

    const { payPeriod } = usePayPeriod(0);
    useEffect(() => {
        if (payPeriod && !defaultsApplied) {
            setSelectedYear(String(payPeriod.payYear));
            setSelectedPeriod(String(payPeriod.periodNumber));
            setDefaultsApplied(true);
        }
    }, [payPeriod, defaultsApplied]);

    const periodReady = !!(selectedYear && selectedPeriod);

    const { rows, homesLoading, homesError, refetchHomes } = usePayrollOverview({
        payYear:      selectedYear,
        periodNumber: selectedPeriod,
        enabled:      periodReady,
    });

    const { houses: reviewData } = useHouseReviews({
        payYear:      selectedYear,
        periodNumber: selectedPeriod,
        enabled:      periodReady,
    });

    // houseId → review row for O(1) lookup in the table
    const reviewMap = useMemo(
        () => new Map(reviewData.map((h) => [h.houseId, h])),
        [reviewData]
    );

    // Community (unassigned) hours row — houseId is the fixed string "community"
    const { coverSheet: communityCoverSheet, isLoading: communityLoading } = useCoverSheet({
        params: {
            homeId:       "community",
            payYear:      selectedYear      ? Number(selectedYear)      : undefined,
            periodNumber: selectedPeriod    ? Number(selectedPeriod)    : undefined,
        },
        enabled: periodReady,
    });
    const communityTotals = communityCoverSheet?.totals ?? null;
    const communityReview = reviewData.find((h) => h.houseId === "community") ?? null;

    const { recompute, isRecomputing, recomputeResult, recomputeError, resetRecompute } =
        useRecomputeStats();

    const { profile } = useProfile();
    const canRecompute = profile?.permissionSlugs?.includes("manage_payroll") ?? false;
    const canSeeHouseReviews = profile?.permissionSlugs?.some((s) =>
        s === "review_all_house_hours" ||
        s === "review_assigned_house_hours" ||
        s === "view_payroll" ||
        s === "manage_payroll"
    ) ?? false;

    const handleView = (homeId) => {
        const qs = new URLSearchParams({ payYear: selectedYear, periodNumber: selectedPeriod }).toString();
        router.push(`/payroll/${homeId}?${qs}`);
    };

    const handleHouseReviews = () => {
        const qs = new URLSearchParams({ payYear: selectedYear, periodNumber: selectedPeriod }).toString();
        router.push(`/payroll/house-reviews?${qs}`);
    };

    const handleRecompute = async () => {
        if (!periodReady) return;
        try {
            await recompute({ payYear: Number(selectedYear), periodNumber: Number(selectedPeriod) });
        } catch (_) { /* surfaced via recomputeError */ }
    };

    return (
        <PageLayout>
            <div className={styles.pageContainer}>

                {/* ── Page header ─────────────────────────────────────────── */}
                <div className={styles.pageHeader}>
                    <div><h1>Payroll Overview</h1></div>
                    {canRecompute && (
                        <Button
                            variant="primary"
                            icon={isRecomputing
                                ? <Loader2 size={14} className={styles.spin} />
                                : <RefreshCw size={14} />
                            }
                            onClick={handleRecompute}
                            disabled={isRecomputing || !periodReady}
                        >
                            {isRecomputing ? "Recomputing…" : "Recompute Stats"}
                        </Button>
                    )}
                </div>

                <div className={styles.overviewCard}>

                    <ActionMessage
                        variant="success"
                        message={recomputeResult
                            ? `Recompute complete — ${recomputeResult.updated ?? 0} updated, ${recomputeResult.pruned ?? 0} pruned, ${recomputeResult.evaluated ?? 0} evaluated`
                            : null
                        }
                        onClose={resetRecompute}
                    />
                    <ActionMessage variant="error" message={recomputeError} />

                    {/* ── Filter bar ───────────────────────────────────────── */}
                    <div className={styles.overviewFilterBar}>
                        <div className={styles.overviewFilterGroup}>
                            <label className={styles.overviewFilterLabel}>Pay Year</label>
                            <select
                                className={styles.overviewFilterSelect}
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(e.target.value)}
                            >
                                <option value="">Select year…</option>
                                {YEAR_OPTIONS.map((y) => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </select>
                        </div>

                        <div className={styles.overviewFilterGroup}>
                            <label className={styles.overviewFilterLabel}>Pay Period</label>
                            <select
                                className={styles.overviewFilterSelect}
                                value={selectedPeriod}
                                onChange={(e) => setSelectedPeriod(e.target.value)}
                            >
                                <option value="">Select period…</option>
                                {PERIOD_OPTIONS.map((p) => (
                                    <option key={p} value={p}>Period {p}</option>
                                ))}
                            </select>
                        </div>

                        {/* Home count + House Reviews button — shown once a period is selected */}
                        {rows.length > 0 && (
                            <>
                                <span className={styles.overviewCount}>{rows.length} homes</span>
                                {canSeeHouseReviews && (
                                    <Button
                                        variant="secondary"
                                        icon={<ClipboardList size={14} />}
                                        onClick={handleHouseReviews}
                                        disabled={!periodReady}
                                    >
                                        House Reviews
                                    </Button>
                                )}
                            </>
                        )}
                    </div>

                    {/* ── Homes table ──────────────────────────────────────── */}
                    <ErrorState isLoading={homesLoading} errorMessage={homesError} onRetry={refetchHomes} />

                    {!homesLoading && !homesError && (
                        <PageTable minWidth="980px">
                            <thead>
                                <tr>
                                    <th>Home</th>
                                    <th>Type</th>
                                    <th>Region</th>
                                    <th>Address</th>
                                    <PageTableHeadCell align="right">Regular Hrs</PageTableHeadCell>
                                    <PageTableHeadCell align="right">Total Hrs</PageTableHeadCell>
                                    <th>Unresolved</th>
                                    <th>Supervisor</th>
                                    <th>Payroll</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {/* Community / unassigned hours — always first */}
                                {periodReady && (
                                    <PageTableRow key="__community__" isEven={false}>
                                        <td
                                            className={styles.overviewHomeCell}
                                            style={{ borderLeft: `4px solid #94a3b8` }}
                                        >
                                            <div className={styles.overviewHomeInner}>
                                                <Building2 size={14} style={{ color: "#94a3b8", flexShrink: 0 }} />
                                                <span>Other Hours</span>
                                            </div>
                                        </td>
                                        <td>—</td>
                                        <td>—</td>
                                        <td>—</td>
                                        <td className={`${styles.overviewNumCell} ${communityLoading ? styles.overviewCellLoading : ""}`}>
                                            {communityLoading ? <Loader2 size={13} className={styles.spin} /> : fmt(communityTotals?.regular)}
                                        </td>
                                        <td className={`${styles.overviewNumCell} ${styles.overviewTotalNum} ${communityLoading ? styles.overviewCellLoading : ""}`}>
                                            {communityLoading ? <Loader2 size={13} className={styles.spin} /> : fmt(communityTotals?.totalHours)}
                                        </td>
                                        <td>
                                            <UnresolvedBadge
                                                unresolvedHours={communityTotals?.unresolvedHours ?? null}
                                                isLoading={communityLoading}
                                            />
                                        </td>
                                        <td>
                                            {communityReview
                                                ? <StatusBadge
                                                    label={communityReview.supervisorStatus === "reviewed" ? "Reviewed" : "Pending"}
                                                    tone={SUPERVISOR_TONE[communityReview.supervisorStatus] ?? "neutral"}
                                                    size="tag"
                                                  />
                                                : <span className={styles.overviewStatusDash}>—</span>
                                            }
                                        </td>
                                        <td>
                                            {communityReview
                                                ? <StatusBadge
                                                    label={communityReview.payrollStatus.charAt(0).toUpperCase() + communityReview.payrollStatus.slice(1)}
                                                    tone={PAYROLL_TONE[communityReview.payrollStatus] ?? "neutral"}
                                                    size="tag"
                                                  />
                                                : <span className={styles.overviewStatusDash}>—</span>
                                            }
                                        </td>
                                        <td className={styles.overviewActionsCell}>
                                            <IconButton
                                                onClick={() => handleView("community")}
                                                title="View Other Hours payroll"
                                            >
                                                <Eye size={15} />
                                            </IconButton>
                                        </td>
                                    </PageTableRow>
                                )}

                                {rows.map(({ home, homeId, totals, isLoading, fetchError }, idx) => {
                                    const typeColor   = HOME_TYPE_COLORS[home.homeType] || COLOR_FALLBACK;
                                    const regionColor = REGION_COLORS[home.region]       || COLOR_FALLBACK;
                                    const review      = reviewMap.get(homeId);
                                    return (
                                        <PageTableRow key={homeId} isEven={idx % 2 !== 0}>

                                            <td
                                                className={styles.overviewHomeCell}
                                                style={{ borderLeft: `4px solid ${typeColor.border}` }}
                                            >
                                                <div className={styles.overviewHomeInner}>
                                                    <Building2 size={14} style={{ color: typeColor.border, flexShrink: 0 }} />
                                                    <span>{home.name}</span>
                                                </div>
                                            </td>

                                            <td>
                                                {home.homeType ? <ColorPill label={home.homeType} color={typeColor} /> : "—"}
                                            </td>

                                            <td>
                                                {home.region ? <ColorPill label={home.region} color={regionColor} /> : "—"}
                                            </td>

                                            <td className={styles.overviewAddressCell}>
                                                {home.address ? (
                                                    <div className={styles.overviewAddressInner}>
                                                        <MapPin size={12} style={{ flexShrink: 0, opacity: 0.45 }} />
                                                        <span>{home.address.street}{home.address.city ? `, ${home.address.city}` : ""}</span>
                                                    </div>
                                                ) : "—"}
                                            </td>

                                            <td className={`${styles.overviewNumCell} ${isLoading ? styles.overviewCellLoading : ""}`}>
                                                {isLoading ? <Loader2 size={13} className={styles.spin} /> : fmt(totals?.regular)}
                                            </td>

                                            <td className={`${styles.overviewNumCell} ${styles.overviewTotalNum} ${isLoading ? styles.overviewCellLoading : ""}`}>
                                                {isLoading ? <Loader2 size={13} className={styles.spin} /> : fmt(totals?.totalHours)}
                                            </td>

                                            <td>
                                                <UnresolvedBadge
                                                    unresolvedHours={totals?.unresolvedHours ?? null}
                                                    isLoading={isLoading && !fetchError}
                                                />
                                            </td>

                                            {/* Supervisor review status */}
                                            <td>
                                                {review
                                                    ? <StatusBadge
                                                        label={review.supervisorStatus === "reviewed" ? "Reviewed" : "Pending"}
                                                        tone={SUPERVISOR_TONE[review.supervisorStatus] ?? "neutral"}
                                                        size="tag"
                                                      />
                                                    : <span className={styles.overviewStatusDash}>—</span>
                                                }
                                            </td>

                                            {/* Payroll status */}
                                            <td>
                                                {review
                                                    ? <StatusBadge
                                                        label={review.payrollStatus.charAt(0).toUpperCase() + review.payrollStatus.slice(1)}
                                                        tone={PAYROLL_TONE[review.payrollStatus] ?? "neutral"}
                                                        size="tag"
                                                      />
                                                    : <span className={styles.overviewStatusDash}>—</span>
                                                }
                                            </td>

                                            <td className={styles.overviewActionsCell}>
                                                <IconButton
                                                    onClick={() => handleView(homeId)}
                                                    title="View payroll details"
                                                    disabled={!periodReady}
                                                >
                                                    <Eye size={15} />
                                                </IconButton>
                                            </td>

                                        </PageTableRow>
                                    );
                                })}

                                {rows.length === 0 && (
                                    <tr>
                                        <PageTableCell isEmpty colSpan={10}>
                                            No homes found.
                                        </PageTableCell>
                                    </tr>
                                )}
                            </tbody>
                        </PageTable>
                    )}
                </div>
            </div>
        </PageLayout>
    );
}
