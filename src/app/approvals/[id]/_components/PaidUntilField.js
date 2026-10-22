"use client";

// ─── PaidUntilField ───────────────────────────────────────────────────────────
//
// The "paid until" time picker for clock_out_review decisions, shared by
// ApproveModal ("Approve until…") and the page's reject form. The time can be
// anything from the clock-in (clockIn.at) up to and including the credited end
// (originalActualEndTime). With includeEnd false (the reject form) the latest
// time is one minute before the credited end — the server refuses the credited
// end itself on a reject (INVALID_PAID_UNTIL — paying it all is an approve).
//
// The date is fixed to the shift's dates (shown as text, or a select for an
// overnight shift); the time is a free <input type="time"> with no min/max, so
// any time can be typed or picked and an out-of-range one just shows the error.
// Together they make a "YYYY-MM-DDTHH:mm" value in business time;
// checkPaidUntil() turns it into the UTC ISO string the API takes, plus the
// hours it would pay.
//
// Props:
//   value          {string}  "YYYY-MM-DDTHH:mm" in business time, or ""
//   onChange       {fn(string)}
//   subjectContext {object}  approval.subjectContext
//   error          {string}  message from checkPaidUntil(), shown under the input
//   includeEnd     {boolean} whether the credited end itself can be picked (default true);
//                            false ends the range a minute before it

import { useState } from "react";
import { DateTime } from "luxon";
import { formatDateTime, formatDateOnly, DISPLAY_TZ } from "@/utils/dates";
import { utcToInputDateTime, utcToDateString, localDateToUtc } from "@/utils/timeHandling";
import styles from "../approval_detail.module.css";

const MINUTE_MS = 60_000;

/**
 * The selectable range, in whole minutes (the input has no seconds): from the
 * first minute at or after the clock-in to the credited end's minute, or the
 * minute before it when the end isn't included.
 */
function paidUntilBounds(ctx, includeEnd = true) {
    const start = Date.parse(ctx?.clockIn?.at ?? "");
    const end   = Date.parse(ctx?.originalActualEndTime ?? "");
    if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
    const minMs = Math.ceil(start / MINUTE_MS) * MINUTE_MS;
    // Whole minutes (the input has no seconds): up to the credited end itself,
    // or one minute before it when the end isn't included.
    const maxMs = Math.floor(end / MINUTE_MS) * MINUTE_MS - (includeEnd ? 0 : MINUTE_MS);
    return maxMs >= minMs ? { startMs: start, minMs, maxMs } : null;
}

/** The business-time dates ("YYYY-MM-DD") the range covers — one, or two for an overnight shift. */
function paidUntilDates(bounds) {
    if (!bounds) return [];
    const last = utcToDateString(new Date(bounds.maxMs).toISOString(), DISPLAY_TZ);
    const dates = [];
    let day = DateTime.fromMillis(bounds.minMs, { zone: DISPLAY_TZ }).startOf("day");
    // A shift is at most ~26 h, so this stops after 2–3 days; the cap is a guard.
    while (dates.length < 7) {
        const date = day.toFormat("yyyy-MM-dd");
        dates.push(date);
        if (date >= last) break;
        day = day.plus({ days: 1 });
    }
    return dates;
}

/**
 * The starting value: the caregiver's "time I left" when it falls in the range
 * (credited end included), else "". The reject form never gets one (isReject).
 */
export function defaultPaidUntil(ctx, isReject = false) {
    if (isReject) return "";
    const bounds = paidUntilBounds(ctx);
    const leftAt = Date.parse(ctx?.explanation?.leftAt ?? "");
    if (!bounds || !Number.isFinite(leftAt)) return "";
    // Whole minutes, as the input shows it
    const leftAtMs = Math.floor(leftAt / MINUTE_MS) * MINUTE_MS;
    if (leftAtMs < bounds.minMs || leftAtMs > bounds.maxMs) return "";
    return utcToInputDateTime(new Date(leftAtMs).toISOString(), DISPLAY_TZ);
}

/** "8:04 AM" when the whole range is on one day (the date is already fixed), else the full date-time. */
function formatRangeEnd(ms, bounds) {
    const sameDay = paidUntilDates(bounds).length === 1;
    return sameDay
        ? DateTime.fromMillis(ms, { zone: DISPLAY_TZ }).toFormat("h:mm a")
        : formatDateTime(new Date(ms).toISOString());
}

/**
 * Validate the picker value.
 *
 * @returns {{ paidUntil: string|null, hours: number|null, error: string, isFullShift: boolean }}
 *   paidUntil   — UTC ISO string for the API, only when valid
 *   hours       — what the shift would pay, rounded to 2 decimals
 *   error       — "" when valid or still empty
 *   isFullShift — the time is the credited end itself, so it pays the full shift
 */
export function checkPaidUntil(value, ctx, includeEnd = true) {
    if (!value) return { paidUntil: null, hours: null, error: "", isFullShift: false };
    const bounds = paidUntilBounds(ctx, includeEnd);
    const ms = Date.parse(localDateToUtc(value, DISPLAY_TZ) ?? "");
    if (!bounds || !Number.isFinite(ms) || ms < bounds.minMs || ms > bounds.maxMs) {
        return {
            paidUntil:   null,
            hours:       null,
            isFullShift: false,
            error:       bounds
                  ? `Choose a time from ${formatRangeEnd(bounds.minMs, bounds)} to ${formatRangeEnd(bounds.maxMs, bounds)}.`
                  : "The clock-in or credited end is missing, so the paid time can't be set here.",
        };
    }
    return {
        paidUntil:   new Date(ms).toISOString(),
        hours:       Math.round(((ms - bounds.startMs) / 3_600_000) * 100) / 100,
        error:       "",
        isFullShift: includeEnd && ms === bounds.maxMs,
    };
}

export default function PaidUntilField({ value, onChange, subjectContext, error, includeEnd = true }) {
    const bounds = paidUntilBounds(subjectContext, includeEnd);
    const dates  = paidUntilDates(bounds);
    const { hours, isFullShift } = checkPaidUntil(value, subjectContext, includeEnd);
    const credited  = subjectContext?.hoursCredited;

    // The date lives here too, so picking a date before a time isn't lost
    // (the combined value stays "" until both are set).
    const [pickedDate, setPickedDate] = useState(value ? value.slice(0, 10) : "");
    const date = (value && value.slice(0, 10)) || pickedDate || dates[0] || "";
    const time = value ? value.slice(11, 16) : "";

    function emit(nextDate, nextTime) {
        onChange(nextDate && nextTime ? `${nextDate}T${nextTime}` : "");
    }

    return (
        <div className={styles.approveReasonField}>
            <label className={styles.approveReasonLabel}>
                Pay until <span style={{ color: "#dc2626" }}>*</span>
            </label>
            <div className={styles.paidUntilRow}>
                {dates.length > 1 ? (
                    // Overnight shift — choose which of its days
                    <select
                        className={styles.approveHoursInput}
                        value={date}
                        onChange={(e) => {
                            setPickedDate(e.target.value);
                            emit(e.target.value, time);
                        }}
                    >
                        {dates.map((d) => (
                            <option key={d} value={d}>{formatDateOnly(d)}</option>
                        ))}
                    </select>
                ) : (
                    <span className={styles.paidUntilDate}>{formatDateOnly(date)}</span>
                )}
                <input
                    type="time"
                    className={styles.approveHoursInput}
                    value={time}
                    onChange={(e) => emit(date, e.target.value)}
                />
            </div>
            {/* Hint/error line — paidUntilHint keeps its text from widening the modal */}
            {error ? (
                <span className={`${styles.approveFieldError} ${styles.paidUntilHint}`}>{error}</span>
            ) : isFullShift ? (
                <span className={`${styles.mutedText} ${styles.paidUntilHint}`}>
                    That&apos;s the credited end, so the full shift is paid.
                </span>
            ) : hours != null ? (
                <span className={`${styles.mutedText} ${styles.paidUntilHint}`}>
                    Pays about {hours} h{Number.isFinite(credited) ? ` instead of ${credited} h` : ""}.
                </span>
            ) : (
                <span className={`${styles.mutedText} ${styles.paidUntilHint}`}>
                    When the caregiver actually left, before the credited end.
                </span>
            )}
        </div>
    );
}
