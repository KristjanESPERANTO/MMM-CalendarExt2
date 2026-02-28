/**
 * Pure date helpers for slot DOM class generation.
 * Zero library dependencies — works as a browser global and Node.js module.
 *
 * Week numbering and week-boundary logic respect the `weekStart` parameter:
 *   0 = Sunday-first (common in the US)
 *   1 = Monday-first / ISO 8601 (default, common in Europe)
 */

/**
 * Returns the day of year (1–366) for a native Date.
 * Uses UTC coordinates of the local date to avoid DST distortion.
 * @param {Date} dt - input date
 * @returns {number}
 */
const getDayOfYear = (dt) => {
  const startOfYear = new Date(Date.UTC(dt.getFullYear(), 0, 1));
  const dUTC = new Date(Date.UTC(dt.getFullYear(), dt.getMonth(), dt.getDate()));
  return Math.floor((dUTC - startOfYear) / 86400000) + 1;
};

/**
 * Returns the week number (1–53) for a given week-start day.
 * Uses a generalised ISO 8601 algorithm: the week whose "middle day"
 * (Thursday for Mon-first, Wednesday for Sun-first) falls earliest in the year
 * is week 1.
 * @param {Date}  dt        - input date
 * @param {0|1}   weekStart - first day of week (0=Sunday, 1=Monday)
 * @returns {number}
 */
const getWeekNumber = (dt, weekStart) => {
  const date = new Date(Date.UTC(dt.getFullYear(), dt.getMonth(), dt.getDate()));
  const dayOffset = (date.getUTCDay() - weekStart + 7) % 7; // 0 = first day of week
  date.setUTCDate(date.getUTCDate() + 3 - dayOffset); // shift to middle day of week
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date - yearStart) / 86400000 + 1) / 7);
};

/**
 * Returns true when two dates fall in the same calendar week.
 * @param {Date}  a         - first date
 * @param {Date}  b         - second date
 * @param {0|1}   weekStart - first day of week (0=Sunday, 1=Monday)
 * @returns {boolean}
 */
const isSameWeekOf = (a, b, weekStart) => {
  const startOf = (dt) => {
    const diff = (dt.getDay() - weekStart + 7) % 7;
    return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate() - diff).getTime();
  };
  return startOf(a) === startOf(b);
};

/**
 * Returns YYYYMMDD as a plain integer for fast date-only comparison.
 * @param {Date} dt - input date
 * @returns {number}
 */
const toDateInt = (dt) =>
  dt.getFullYear() * 10000 + (dt.getMonth() + 1) * 100 + dt.getDate();

/**
 * Computes all date info needed for slot DOM class assignment.
 * Pure function — no library dependencies.
 *
 * Note: `isSameMonth` checks month index only (not year), matching original code.
 *
 * @param {Date}      slotStart    - slot start as a native Date
 * @param {Date|null} slotEnd      - slot end as a native Date (needed for range-based "today")
 * @param {Date}      [nowOverride]  - substitute for "now" (injectable in tests)
 * @param {0|1}       [weekStart=1]  - first day of week (0=Sunday, 1=Monday)
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
const getSlotDateInfo = (slotStart, slotEnd, nowOverride, weekStart = 1) => {
  const dt = slotStart;
  const now = nowOverride ?? new Date();
  const dtInt = toDateInt(dt);
  const nowInt = toDateInt(now);

  return {
    isSameYear: now.getFullYear() === dt.getFullYear(),
    isSameMonth: now.getMonth() === dt.getMonth(),
    isSameWeek: isSameWeekOf(now, dt, weekStart),
    isToday: nowInt === dtInt,
    nowInRange: slotEnd instanceof Date ? dt <= now && now <= slotEnd : false,
    isPassed: nowInt > dtInt,
    weekday: dt.getDay() || 7, // Mon=1 … Sat=6, Sun=7 (ISO)
    year: dt.getFullYear(),
    month: dt.getMonth() + 1, // 1-indexed
    day: dt.getDate(),
    week: getWeekNumber(dt, weekStart),
    dayOfYear: getDayOfYear(dt)
  };
};


const SlotDateHelpers = {getSlotDateInfo};

if (typeof module !== "undefined" && module.exports) {
  module.exports = SlotDateHelpers;
}
