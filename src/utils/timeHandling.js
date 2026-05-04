import { DateTime } from "luxon";

// For Calendar Date Object (shifts the local time so date-fns format works correctly)
export function utcToZonedDateObject(utcString, timeZone) {
    const dt = DateTime.fromISO(utcString, { zone: "utc" }).setZone(timeZone);
    return new Date(dt.year, dt.month - 1, dt.day, dt.hour, dt.minute, dt.second, dt.millisecond);
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