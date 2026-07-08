import { DateTime } from "luxon";

// Safety cap so a mis-entered shift (e.g. a runaway 1000-hour range) can't
// generate thousands of day segments and freeze the calendar render.
const MAX_SPAN_DAYS = 60;

// For Calendar Date Object (shifts the local time so date-fns format works correctly)
export function utcToZonedDateObject(utcString, timeZone) {
    const dt = DateTime.fromISO(utcString, { zone: "utc" }).setZone(timeZone);
    return new Date(dt.year, dt.month - 1, dt.day, dt.hour, dt.minute, dt.second, dt.millisecond);
}

// Convert a zoned Luxon DateTime to a local-wall-clock JS Date (same trick as
// utcToZonedDateObject) so date-fns format()/react-big-calendar place it on the
// correct calendar day regardless of the browser's own timezone.
function zonedToLocalDate(dt) {
    return new Date(dt.year, dt.month - 1, dt.day, dt.hour, dt.minute, dt.second, dt.millisecond);
}

/**
 * Expand a shift into the calendar days it spans in the given timezone.
 *
 * A multi-day shift (e.g. a 24h or 36h shift) overlaps more than one calendar
 * day. Callers that bucket or render shifts per day must place the shift on
 * EVERY day it touches — not just the day it starts — or long shifts vanish from
 * later days. This returns one entry per spanned day.
 *
 * Each entry:
 *   dateStr   — "yyyy-MM-dd" calendar day (the bucket/grid key)
 *   dayStart  — local-wall-clock Date at 00:00 of that day (calendar placement)
 *   segStart  — where the shift's portion on this day begins
 *               (the real start on the first day; 00:00 on later days)
 *   segEnd    — where the shift's portion on this day ends
 *               (the real end on the last day; 23:59:59.999 on earlier days)
 *   isFirst   — true on the day the shift starts
 *   isLast    — true on the day the shift ends
 *   index     — 0-based position within the span
 *   spanDays  — total number of days the shift spans (same on every entry)
 *
 * A shift ending exactly at local midnight does NOT occupy that final day
 * (e.g. 08:00 → next-day 00:00 spans only the first day).
 */
export function expandShiftDays(startUtc, endUtc, timeZone) {
    if (!startUtc || !endUtc) return [];
    const startZ = DateTime.fromISO(startUtc, { zone: "utc" }).setZone(timeZone);
    const endZ   = DateTime.fromISO(endUtc,   { zone: "utc" }).setZone(timeZone);
    if (!startZ.isValid || !endZ.isValid) return [];

    const startDay = startZ.startOf("day");
    let   lastDay  = endZ.startOf("day");

    // A shift ending exactly at local midnight doesn't occupy that final day.
    if (endZ > startZ && +endZ === +lastDay) lastDay = lastDay.minus({ days: 1 });
    // Guard against inverted / zero-length ranges: keep the shift on its start day.
    if (lastDay < startDay) lastDay = startDay;

    const segments = [];
    let cursor = startDay;
    let index  = 0;
    while (cursor <= lastDay && index < MAX_SPAN_DAYS) {
        const isFirst   = +cursor === +startDay;
        const isLast    = +cursor === +lastDay;
        const segStartZ = isFirst ? startZ : cursor;              // cursor = 00:00 of the day
        const segEndZ   = isLast  ? endZ   : cursor.endOf("day"); // 23:59:59.999
        segments.push({
            dateStr:  cursor.toFormat("yyyy-MM-dd"),
            dayStart: zonedToLocalDate(cursor),
            segStart: zonedToLocalDate(segStartZ),
            segEnd:   zonedToLocalDate(segEndZ),
            isFirst,
            isLast,
            index,
        });
        cursor = cursor.plus({ days: 1 });
        index++;
    }

    const spanDays = segments.length;
    segments.forEach((s) => { s.spanDays = spanDays; });
    return segments;
}

// For displaying time like "15:30"
export function utcToDisplayTime(utcString, timeZone) {
    if (!utcString) return "";
    return DateTime.fromISO(utcString, { zone: "utc" })
        .setZone(timeZone)
        .toFormat("HH:mm");
}

// For displaying date like "April 24, 2025"
export function utcToDate(utcString, timeZone) {
    if (!utcString) return "—";
    return DateTime.fromISO(utcString, { zone: "utc" })
        .setZone(timeZone)
        .toFormat("MMMM d, yyyy");
}

// For displaying weekday like "Thursday"
export function utcToWeekday(utcString, timeZone) {
    if (!utcString) return "—";
    return DateTime.fromISO(utcString, { zone: "utc" })
        .setZone(timeZone)
        .toFormat("cccc");
}

// For displaying full date time like "Apr 24, 2025 15:30"
export function utcToFullDisplay(utcString, timeZone) {
    if (!utcString) return "—";
    return DateTime.fromISO(utcString, { zone: "utc" })
        .setZone(timeZone)
        .toFormat("MMM d, yyyy HH:mm");
}

// For <input type="datetime-local"> pre-filling ("YYYY-MM-DDTHH:mm")
export function utcToInputDateTime(utcString, timeZone) {
    if (!utcString) return "";
    return DateTime.fromISO(utcString, { zone: "utc" })
        .setZone(timeZone)
        .toFormat("yyyy-MM-dd'T'HH:mm");
}