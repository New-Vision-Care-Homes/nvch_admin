"use client";

// ============================================================
// IMPORTS
// ------------------------------------------------------------
// Purpose:
//   Pull in all external libraries, UI components, hooks, and
//   utilities this page depends on.
//
// Relationship:
//   - usePayrollExceptions fetches the three exception arrays.
//   - useCoverSheet is called purely for home info (name, type,
//     region). It shares the same React Query cache key as the
//     detail page so this is usually a cache-hit — no extra
//     network request.
//   - detailStyles reuses the home card, period strip, and
//     pageHeader classes from the detail page for visual
//     consistency across the payroll section.
// ============================================================

import { useParams, useSearchParams, useRouter } from "next/navigation";
import {
    Undo2,
    Building2,
    Timer,
    TrendingUp,
    TrendingDown,
    CheckCircle2,
    ExternalLink,
} from "lucide-react";
import PageLayout  from "@components/layout/PageLayout";
import ErrorState  from "@components/UI/ErrorState";
import Button      from "@components/UI/Button";
import { usePayrollExceptions, useCoverSheet } from "@/hooks/usePayroll";
import { formatDateTime } from "@/utils/dates";
import {
    HOME_TYPE_COLORS,
    REGION_COLORS,
    COLOR_FALLBACK,
} from "@/utils/dropdown_list";
import styles       from "./exceptions.module.css";
import detailStyles from "../payroll_detail.module.css";


// ============================================================
// SECTION: Page Component — PayrollExceptionsPage
// ------------------------------------------------------------
// Purpose:
//   Full list of payroll exceptions for a single home and pay
//   period. Displays three categorised sections — Unresolved
//   Overage, Bank Cap Exceeded, and Negative Balances — so
//   payroll coordinators can identify and resolve problems
//   before exporting.
//
// Relationship:
//   - Reached from PayrollDetailPage via the exception banner.
//   - homeId comes from the dynamic URL segment (/payroll/[id]).
//   - payYear and periodNumber come from query params, matching
//     the period the user was already viewing.
//   - Clicking a row navigates to the relevant approval or shift
//     detail page for resolution.
//
// Flow:
//   URL params parsed (homeId, payYear, periodNumber)
//        ↓
//   useCoverSheet  → coverSheet.home (for the home card)
//   usePayrollExceptions → { unresolvedOverage, bankCapExceeded, negativeBalances }
//        ↓
//   Three section cards rendered — each empty section shows a
//   green "All clear" confirmation row instead of items.
// ============================================================

export default function PayrollExceptionsPage() {

    // ── Route params & URL search params ─────────────────────────────────────
    const { id: homeId } = useParams();
    const searchParams   = useSearchParams();
    const router         = useRouter();

    const payYear      = searchParams.get("payYear")      || "";
    const periodNumber = searchParams.get("periodNumber") || "";

    // Shared params object — passed to both hooks so their query keys match.
    const queryParams = {
        homeId,
        payYear:      payYear      ? Number(payYear)      : undefined,
        periodNumber: periodNumber ? Number(periodNumber) : undefined,
    };
    const queryEnabled = !!(homeId && payYear && periodNumber);


    // ── Data: home info (from cover sheet cache) ──────────────────────────────
    const { coverSheet } = useCoverSheet({ params: queryParams, enabled: queryEnabled });

    const home        = coverSheet?.home ?? null;
    const typeColor   = HOME_TYPE_COLORS[home?.homeType] || COLOR_FALLBACK;
    const regionColor = REGION_COLORS[home?.region]      || COLOR_FALLBACK;


    // ── Data: exceptions ──────────────────────────────────────────────────────
    const {
        unresolvedOverage,
        bankCapExceeded,
        negativeBalances,
        isLoading,
        fetchError,
        refetch,
    } = usePayrollExceptions({ params: queryParams, enabled: queryEnabled });
    console.log(unresolvedOverage);


    // ── Back-navigation URL ───────────────────────────────────────────────────
    const backHref = `/payroll/${homeId}${payYear && periodNumber
        ? `?payYear=${payYear}&periodNumber=${periodNumber}`
        : ""}`;




    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <PageLayout>
            <div>

                {/* ── Page header: title left, back button right ────────────── */}
                <div className={detailStyles.pageHeader}>
                    <div>
                        <h1>Payroll Exceptions</h1>
                    </div>
                    <div className={detailStyles.headerActions}>
                        <Button
                            variant="secondary"
                            icon={<Undo2 size={16} />}
                            onClick={() => router.push(backHref)}
                        >
                            Back
                        </Button>
                    </div>
                </div>

                {/* ── Home info card ───────────────────────────────────────── */}
                {home && (
                    <div className={detailStyles.homeCard}>
                        <div
                            className={detailStyles.homeCardIcon}
                            style={{ background: typeColor.bg }}
                        >
                            <Building2 size={20} style={{ color: typeColor.border }} />
                        </div>
                        <div className={detailStyles.homeCardBody}>
                            <p className={detailStyles.homeCardName}>
                                {home.name ?? "—"}
                            </p>
                            <div className={detailStyles.homeCardMeta}>
                                {home.homeType && (
                                    <span
                                        className={detailStyles.homeCardPill}
                                        style={{ background: typeColor.bg, color: typeColor.text, borderColor: typeColor.border }}
                                    >
                                        {home.homeType}
                                    </span>
                                )}
                                {home.region && (
                                    <span
                                        className={detailStyles.homeCardPill}
                                        style={{ background: regionColor.bg, color: regionColor.text, borderColor: regionColor.border }}
                                    >
                                        {home.region}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Period strip ─────────────────────────────────────────── */}
                <div className={detailStyles.periodStrip}>
                    <div className={detailStyles.periodItem}>
                        <span className={detailStyles.periodItemLabel}>Pay Year</span>
                        <span className={detailStyles.periodItemValue}>{payYear || "—"}</span>
                    </div>
                    <div className={detailStyles.periodItem}>
                        <span className={detailStyles.periodItemLabel}>Pay Period</span>
                        <span className={detailStyles.periodItemValue}>{periodNumber || "—"}</span>
                    </div>
                </div>

                {/* ── Loading / error gate ──────────────────────────────────── */}
                <ErrorState isLoading={isLoading} errorMessage={fetchError} onRetry={refetch} />

                {!isLoading && !fetchError && (
                    <>

                        {/* ── Section 1: Unresolved Overage ────────────────── */}
                        {/*
                            Red theme. Each item links to its approval (if one
                            exists) or to the underlying shift so the coordinator
                            can take action directly.
                        */}
                        <div className={styles.sectionCard}>
                            <div className={styles.sectionHeader}>
                                <Timer size={16} color="#dc2626" />
                                <span className={styles.sectionTitle}>Unresolved Overage</span>
                                <span className={styles.sectionCountRed}>
                                    {unresolvedOverage.length} item{unresolvedOverage.length !== 1 ? "s" : ""}
                                </span>
                            </div>
                            <div className={styles.sectionBody}>
                                {unresolvedOverage.length === 0 ? (
                                    <div className={styles.allClear}>
                                        <CheckCircle2 size={15} />
                                        All clear — no unresolved overage
                                    </div>
                                ) : (
                                    unresolvedOverage.map((item, index) => {
                                        const isLastRow       = index === unresolvedOverage.length - 1;
                                        const destinationPath = item.approvalId
                                            ? `/approvals/${item.approvalId}`
                                            : `/scheduling/${item.shiftId}`;

                                        return (
                                            <div
                                                key={item.approvalId ?? item.shiftId ?? index}
                                                className={`${styles.exceptionRow} ${isLastRow ? styles.exceptionRowLast : ""}`}
                                                onClick={() => router.push(destinationPath)}
                                                role="button"
                                                tabIndex={0}
                                                onKeyDown={(event) => event.key === "Enter" && router.push(destinationPath)}
                                            >
                                                <div className={styles.exceptionIconBox} style={{ background: "#fef2f2" }}>
                                                    <Timer size={14} color="#dc2626" />
                                                </div>
                                                <div className={styles.exceptionBody}>
                                                    <span className={styles.exceptionName}>{`${item.caregiver?.firstName ?? ""} ${item.caregiver?.lastName ?? ""}`.trim() || "—"}</span>
                                                    <span className={styles.exceptionMeta}>
                                                        {item.startTime && formatDateTime(item.startTime)}
                                                        {item.plannedOverageHours != null && (
                                                            <span>{item.plannedOverageHours}h over capacity</span>
                                                        )}
                                                        {item.ackStatus && (
                                                            <span
                                                                className={styles.exceptionBadge}
                                                                style={{ color: "#dc2626", background: "#fef2f2", borderColor: "#fca5a5" }}
                                                            >
                                                                {item.ackStatus}
                                                            </span>
                                                        )}
                                                    </span>
                                                </div>
                                                <ExternalLink size={14} className={styles.exceptionLink} />
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>

                        {/* ── Section 2: Bank Cap Exceeded ─────────────────── */}
                        {/*
                            Amber theme. Links to the shift where the bank cap
                            was exceeded so the coordinator can adjust hours.
                        */}
                        <div className={styles.sectionCard}>
                            <div className={styles.sectionHeader}>
                                <TrendingUp size={16} color="#d97706" />
                                <span className={styles.sectionTitle}>Bank Cap Exceeded</span>
                                <span className={styles.sectionCountAmber}>
                                    {bankCapExceeded.length} item{bankCapExceeded.length !== 1 ? "s" : ""}
                                </span>
                            </div>
                            <div className={styles.sectionBody}>
                                {bankCapExceeded.length === 0 ? (
                                    <div className={styles.allClear}>
                                        <CheckCircle2 size={15} />
                                        All clear — no bank cap exceeded
                                    </div>
                                ) : (
                                    bankCapExceeded.map((item, index) => {
                                        const isLastRow       = index === bankCapExceeded.length - 1;
                                        const destinationPath = `/scheduling/${item.shiftId}`;

                                        return (
                                            <div
                                                key={item.shiftId ?? index}
                                                className={`${styles.exceptionRow} ${isLastRow ? styles.exceptionRowLast : ""}`}
                                                onClick={() => router.push(destinationPath)}
                                                role="button"
                                                tabIndex={0}
                                                onKeyDown={(event) => event.key === "Enter" && router.push(destinationPath)}
                                            >
                                                <div className={styles.exceptionIconBox} style={{ background: "#fffbeb" }}>
                                                    <TrendingUp size={14} color="#d97706" />
                                                </div>
                                                <div className={styles.exceptionBody}>
                                                    <span className={styles.exceptionName}>{`${item.caregiver?.firstName ?? ""} ${item.caregiver?.lastName ?? ""}`.trim() || "—"}</span>
                                                    <span className={styles.exceptionMeta}>
                                                        {item.startTime && formatDateTime(item.startTime)}
                                                    </span>
                                                </div>
                                                <ExternalLink size={14} className={styles.exceptionLink} />
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>

                        {/* ── Section 3: Negative Balances ─────────────────── */}
                        {/*
                            Orange theme. No navigable destination — these are
                            account-level issues shown for awareness only.
                        */}
                        <div className={styles.sectionCard}>
                            <div className={styles.sectionHeader}>
                                <TrendingDown size={16} color="#ea580c" />
                                <span className={styles.sectionTitle}>Negative Balances</span>
                                <span className={styles.sectionCountOrange}>
                                    {negativeBalances.length} item{negativeBalances.length !== 1 ? "s" : ""}
                                </span>
                            </div>
                            <div className={styles.sectionBody}>
                                {negativeBalances.length === 0 ? (
                                    <div className={styles.allClear}>
                                        <CheckCircle2 size={15} />
                                        All clear — no negative balances
                                    </div>
                                ) : (
                                    negativeBalances.map((item, index) => {
                                        const isLastRow = index === negativeBalances.length - 1;

                                        return (
                                            <div
                                                key={item.caregiver?._id ?? index}
                                                className={`${styles.exceptionRow} ${styles.exceptionRowStatic} ${isLastRow ? styles.exceptionRowLast : ""}`}
                                            >
                                                <div className={styles.exceptionIconBox} style={{ background: "#fff7ed" }}>
                                                    <TrendingDown size={14} color="#ea580c" />
                                                </div>
                                                <div className={styles.exceptionBody}>
                                                    <span className={styles.exceptionName}>{`${item.caregiver?.firstName ?? ""} ${item.caregiver?.lastName ?? ""}`.trim() || "—"}</span>
                                                    {item.balanceHours != null && (
                                                        <span className={styles.exceptionMeta}>{item.balanceHours}h</span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>

                        {/* ── Footer note ───────────────────────────────────── */}
                        <p className={styles.footerNote}>
                            Resolve all exceptions before exporting payroll data.
                        </p>

                    </>
                )}

            </div>
        </PageLayout>
    );
}
