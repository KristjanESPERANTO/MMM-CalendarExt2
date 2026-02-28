/**
 * Pure date helpers for slot DOM class generation.
 * Zero library dependencies — works as a browser global and Node.js module.
 *
 * Uses ISO 8601 week numbering throughout (weeks always start on Monday).
 * This differs from the previous dayjs behaviour where the week start day was
 * locale-dependent (e.g. Sunday in en-US). The practical effect is limited to
 * Sundays: with ISO numbering, Sunday belongs to the *previous* week, whereas
 * a Sunday-first locale would treat it as the start of a new week.
 * Since MMM-CalendarExt2 has no weekStart config option, ISO is used as the
 * well-defined default.
 */

/**
 * Returns the day of year (1–366) for a native Date.
 * Uses UTC coordinates of the local date to avoid DST distortion.
 * @param {Date} d - input date
 * @returns {number}
 */
const getDayOfYear = (dt) => {
  const startOfYear = new Date(Date.UTC(dt.getFullYear(), 0, 1));
  const dUTC = new Date(Date.UTC(dt.getFullYear(), dt.getMonth(), dt.getDate()));
  return Math.floor((dUTC - startOfYear) / 86400000) + 1;
};

/**
 * Returns the ISO 8601 week number (1–53). Weeks start on Monday.
 * Handles year-boundary weeks correctly (e.g. Dec 30 may be week 1 of next year).
 * @param {Date} d - input date
 * @returns {number}
 */
const getISOWeek = (dt) => {
  const date = new Date(Date.UTC(dt.getFullYear(), dt.getMonth(), dt.getDate()));
  const dayNum = date.getUTCDay() || 7; // Sun=0 → 7, Mon=1 … Sat=6
  date.setUTCDate(date.getUTCDate() + 4 - dayNum); // shift to Thursday of week
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date - yearStart) / 86400000 + 1) / 7);
};

/**
 * Returns YYYYMMDD as a plain integer for fast date-only comparison.
 * @param {Date} d - input date
 * @returns {number}
 */
const toDateInt = (dt) =>
  dt.getFullYear() * 10000 + (dt.getMonth() + 1) * 100 + dt.getDate();

/**
 * Computes all date info needed for slot DOM class assignment.
 * Pure function — no library dependencies.
 *
 * Notes on deliberate behaviour preservation:
 * - `isSameMonth` checks month index only (not year), matching original code.
 * - `isSameWeek`  checks week number only (not year-week), matching original.
 *
 * @param {Date}      slotStart   - slot start as a native Date
 * @param {Date|null} slotEnd     - slot end as a native Date (needed for range-based "today")
 * @param {Date}      [nowOverride] - substitute for "now" (injectable in tests)
 * @returns {{
 *   isSameYear:  boolean,
 *   isSameMonth: boolean,
 *   isSameWeek:  boolean,
 *   isToday:     boolean,
 *   nowInRange:  boolean,
 *   isPassed:    boolean,
 *   weekday:     number,
 *   year:        number,
 *   month:       number,
 *   day:         number,
 *   week:        number,
 *   dayOfYear:   number,
 * }}
 */
const getSlotDateInfo = (slotStart, slotEnd, nowOverride) => {
  const dt = slotStart;
  const now = nowOverride ?? new Date();
  const dtInt = toDateInt(dt);
  const nowInt = toDateInt(now);

  return {
    isSameYear: now.getFullYear() === dt.getFullYear(),
    isSameMonth: now.getMonth() === dt.getMonth(),
    isSameWeek: getISOWeek(now) === getISOWeek(dt),
    isToday: nowInt === dtInt,
    nowInRange: slotEnd instanceof Date ? dt <= now && now <= slotEnd : false,
    isPassed: nowInt > dtInt,
    weekday: dt.getDay() || 7, // Mon=1 … Sat=6, Sun=7 (ISO)
    year: dt.getFullYear(),
    month: dt.getMonth() + 1, // 1-indexed
    day: dt.getDate(),
    week: getISOWeek(dt),
    dayOfYear: getDayOfYear(dt)
  };
};


const SlotDateHelpers = {getSlotDateInfo};

if (typeof module !== "undefined" && module.exports) {
  module.exports = SlotDateHelpers;
}
