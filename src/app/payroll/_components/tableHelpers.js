export function fmtHours(n) {
    if (n == null || n === 0) return "—";
    return Number(n).toFixed(2);
}

export function fmtDollars(n) {
    if (n == null || n === 0) return "—";
    return `$${Number(n).toFixed(2)}`;
}

export function fmtDayHeader(isoDate) {
    if (!isoDate) return "";
    const [, month, day] = isoDate.split("-");
    return `${parseInt(month, 10)}/${parseInt(day, 10)}`;
}
