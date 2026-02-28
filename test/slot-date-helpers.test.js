const assert = require("node:assert/strict");
const {describe, it} = require("node:test");

const {getSlotDateInfo} = require("../lib/slot-date-helpers");

// ---------------------------------------------------------------------------
// Fixed reference dates (all deterministic via nowOverride)
//
//  Mon-first (weekStart=1 / ISO 8601)
//    week 8 of 2026  →  Feb 16 (Mon) – Feb 22 (Sun)
//    week 9 of 2026  →  Feb 23 (Mon) – Mar 01 (Sun)
//    week 10 of 2026 →  Mar 02 (Mon) – Mar 08 (Sun)
//
//  Sun-first (weekStart=0)
//    week 8 of 2026  →  Feb 22 (Sun) – Feb 28 (Sat)
//    week 9 of 2026  →  Mar 01 (Sun) – Mar 07 (Sat)
// ---------------------------------------------------------------------------
const sat = new Date(2026, 1, 28); // Feb 28, 2026 (Saturday) — "today" baseline
const fri = new Date(2026, 1, 27); // Feb 27, 2026 (Friday)
const sun = new Date(2026, 2, 1); // Mar  1, 2026 (Sunday — last day ISO week 9)
const mon = new Date(2026, 2, 2); // Mar  2, 2026 (Monday — first day ISO week 10)
const tue = new Date(2026, 2, 3); // Mar  3, 2026 (Tuesday)
const wed = new Date(2026, 2, 4); // Mar  4, 2026 (Wednesday)
const thu = new Date(2026, 2, 5); // Mar  5, 2026 (Thursday)

// ---------------------------------------------------------------------------
// weekday (Mon=1 … Sat=6, Sun=7)
// ---------------------------------------------------------------------------
describe("getSlotDateInfo – weekday", () => {
  const pairs = [
    [mon, 1, "Monday"],
    [tue, 2, "Tuesday"],
    [wed, 3, "Wednesday"],
    [thu, 4, "Thursday"],
    [fri, 5, "Friday"],
    [sat, 6, "Saturday"],
    [sun, 7, "Sunday"]
  ];

  for (const [date, expected, label] of pairs) {
    it(`${label} → weekday ${expected}`, () => {
      const {weekday} = getSlotDateInfo(date, null, sat);
      assert.equal(weekday, expected);
    });
  }

  it("Saturday specifically returns 6, not the broken 'E' string", () => {
    assert.equal(typeof getSlotDateInfo(sat, null, sat).weekday, "number");
    assert.equal(getSlotDateInfo(sat, null, sat).weekday, 6);
  });
});

// ---------------------------------------------------------------------------
// year / month / day
// ---------------------------------------------------------------------------
describe("getSlotDateInfo – year, month, day", () => {
  it("returns correct year", () => {
    assert.equal(getSlotDateInfo(sat, null, sat).year, 2026);
  });

  it("month is 1-indexed (Feb → 2)", () => {
    assert.equal(getSlotDateInfo(sat, null, sat).month, 2);
  });

  it("month for December is 12", () => {
    const dec31 = new Date(2026, 11, 31);
    assert.equal(getSlotDateInfo(dec31, null, sat).month, 12);
  });

  it("day of month", () => {
    assert.equal(getSlotDateInfo(sat, null, sat).day, 28);
  });
});

// ---------------------------------------------------------------------------
// week (ISO 8601)
// ---------------------------------------------------------------------------
describe("getSlotDateInfo – week (ISO 8601)", () => {
  it("Feb 28, 2026 (Saturday) is ISO week 9", () => {
    assert.equal(getSlotDateInfo(sat, null, sat).week, 9);
  });

  it("Mar 1, 2026 (Sunday) is still ISO week 9", () => {
    assert.equal(getSlotDateInfo(sun, null, sat).week, 9);
  });

  it("Mar 2, 2026 (Monday) starts ISO week 10", () => {
    assert.equal(getSlotDateInfo(mon, null, sat).week, 10);
  });

  it("Jan 1, 2026 (Thursday) is ISO week 1", () => {
    const jan1 = new Date(2026, 0, 1);
    assert.equal(getSlotDateInfo(jan1, null, sat).week, 1);
  });

  it("Dec 28, 2026 (Monday) is ISO week 53 of 2026", () => {
    // 2026 has 53 ISO weeks because Jan 1 is a Thursday
    const dec28 = new Date(2026, 11, 28);
    assert.equal(getSlotDateInfo(dec28, null, sat).week, 53);
  });
});

// ---------------------------------------------------------------------------
// dayOfYear
// ---------------------------------------------------------------------------
describe("getSlotDateInfo – dayOfYear", () => {
  it("Jan 1 is day 1", () => {
    const jan1 = new Date(2026, 0, 1);
    assert.equal(getSlotDateInfo(jan1, null, sat).dayOfYear, 1);
  });

  it("Feb 28 (non-leap) is day 59", () => {
    assert.equal(getSlotDateInfo(sat, null, sat).dayOfYear, 59);
  });

  it("Dec 31 (non-leap year) is day 365", () => {
    const dec31 = new Date(2026, 11, 31);
    assert.equal(getSlotDateInfo(dec31, null, sat).dayOfYear, 365);
  });

  it("Feb 29 in leap year 2024 is day 60", () => {
    const feb29 = new Date(2024, 1, 29);
    assert.equal(getSlotDateInfo(feb29, null, sat).dayOfYear, 60);
  });

  it("Dec 31 in leap year 2024 is day 366", () => {
    const dec31leap = new Date(2024, 11, 31);
    assert.equal(getSlotDateInfo(dec31leap, null, sat).dayOfYear, 366);
  });
});

// ---------------------------------------------------------------------------
// isToday
// ---------------------------------------------------------------------------
describe("getSlotDateInfo – isToday", () => {
  it("slot on same date as now → true", () => {
    assert.ok(getSlotDateInfo(sat, null, sat).isToday);
  });

  it("slot on yesterday → false", () => {
    assert.ok(!getSlotDateInfo(fri, null, sat).isToday);
  });

  it("slot on tomorrow → false", () => {
    assert.ok(!getSlotDateInfo(sun, null, sat).isToday);
  });
});

// ---------------------------------------------------------------------------
// isPassed
// ---------------------------------------------------------------------------
describe("getSlotDateInfo – isPassed", () => {
  it("yesterday is passed", () => {
    assert.ok(getSlotDateInfo(fri, null, sat).isPassed);
  });

  it("today is not passed", () => {
    assert.ok(!getSlotDateInfo(sat, null, sat).isPassed);
  });

  it("tomorrow is not passed", () => {
    assert.ok(!getSlotDateInfo(sun, null, sat).isPassed);
  });

  it("date in previous year is passed", () => {
    const lastYear = new Date(2025, 1, 28);
    assert.ok(getSlotDateInfo(lastYear, null, sat).isPassed);
  });
});

// ---------------------------------------------------------------------------
// isSameYear
// ---------------------------------------------------------------------------
describe("getSlotDateInfo – isSameYear", () => {
  it("same year → true", () => {
    assert.ok(getSlotDateInfo(sun, null, sat).isSameYear); // Mar 1, 2026
  });

  it("previous year → false", () => {
    const dec31last = new Date(2025, 11, 31);
    assert.ok(!getSlotDateInfo(dec31last, null, sat).isSameYear);
  });
});

// ---------------------------------------------------------------------------
// isSameMonth
// ---------------------------------------------------------------------------
describe("getSlotDateInfo – isSameMonth", () => {
  it("same month index → true", () => {
    assert.ok(getSlotDateInfo(fri, null, sat).isSameMonth); // Feb 27 vs Feb 28
  });

  it("different month → false", () => {
    assert.ok(!getSlotDateInfo(sun, null, sat).isSameMonth); // March vs February
  });
});

// ---------------------------------------------------------------------------
// isSameWeek (ISO)
// ---------------------------------------------------------------------------
describe("getSlotDateInfo – isSameWeek", () => {
  it("slot in same ISO week as now → true", () => {
    const monSameWeek = new Date(2026, 1, 23); // Feb 23, ISO week 9
    assert.ok(getSlotDateInfo(monSameWeek, null, sat).isSameWeek);
  });

  it("slot in previous ISO week → false", () => {
    const sunPrevWeek = new Date(2026, 1, 22); // Feb 22, ISO week 8
    assert.ok(!getSlotDateInfo(sunPrevWeek, null, sat).isSameWeek);
  });

  it("slot in next ISO week → false", () => {
    assert.ok(!getSlotDateInfo(mon, null, sat).isSameWeek); // Mar 2, ISO week 10
  });
});

// ---------------------------------------------------------------------------
// nowInRange (for weekly / monthly "today")
// ---------------------------------------------------------------------------
describe("getSlotDateInfo – nowInRange", () => {
  const weekStart = new Date(2026, 1, 23, 0, 0, 0); // Feb 23 00:00:00
  const weekEnd = new Date(2026, 2, 1, 23, 59, 59); // Mar  1 23:59:59

  it("now within [slotStart, slotEnd] → true", () => {
    assert.ok(getSlotDateInfo(weekStart, weekEnd, sat).nowInRange);
  });

  it("now after slotEnd → false", () => {
    const afterEnd = new Date(2026, 2, 2); // Mar 2
    assert.ok(!getSlotDateInfo(weekStart, weekEnd, afterEnd).nowInRange);
  });

  it("now before slotStart → false", () => {
    const beforeStart = new Date(2026, 1, 22); // Feb 22
    assert.ok(!getSlotDateInfo(weekStart, weekEnd, beforeStart).nowInRange);
  });

  it("slotEnd is null → always false", () => {
    assert.ok(!getSlotDateInfo(sat, null, sat).nowInRange);
  });
});

// ---------------------------------------------------------------------------
// weekStart=1 (ISO 8601, default) — all tests above implicitly use this
// ---------------------------------------------------------------------------
describe("getSlotDateInfo – isSameWeek weekStart=1 (default)", () => {
  it("Sat Feb 28 and Sun Mar 1 are in the same Mon-first week", () => {
    assert.ok(getSlotDateInfo(sun, null, sat, 1).isSameWeek);
  });

  it("Sat Feb 28 and Mon Mar 2 are in different Mon-first weeks", () => {
    assert.ok(!getSlotDateInfo(mon, null, sat, 1).isSameWeek);
  });
});

// ---------------------------------------------------------------------------
// weekStart=0 (Sunday-first)
// ---------------------------------------------------------------------------
describe("getSlotDateInfo – isSameWeek weekStart=0", () => {
  it("Sat Feb 28 and Sun Mar 1 are in DIFFERENT Sun-first weeks", () => {
    // With weekStart=0: Feb 28 is in Sun Feb 22 – Sat Feb 28; Mar 1 starts a new week
    assert.ok(!getSlotDateInfo(sun, null, sat, 0).isSameWeek);
  });

  it("Sun Mar 1 and Sat Mar 7 are in the same Sun-first week", () => {
    const mar7 = new Date(2026, 2, 7);
    assert.ok(getSlotDateInfo(mar7, null, sun, 0).isSameWeek);
  });

  it("Sun Feb 22 and Sat Feb 28 are in the same Sun-first week", () => {
    const feb22 = new Date(2026, 1, 22);
    assert.ok(getSlotDateInfo(sat, null, feb22, 0).isSameWeek);
  });

  it("Sat Feb 21 and Sun Feb 22 are in DIFFERENT Sun-first weeks", () => {
    const feb21 = new Date(2026, 1, 21);
    const feb22 = new Date(2026, 1, 22);
    assert.ok(!getSlotDateInfo(feb22, null, feb21, 0).isSameWeek);
  });
});

describe("getSlotDateInfo – week number weekStart=0", () => {
  it("Sat Feb 28 is Sun-first week 8", () => {
    assert.equal(getSlotDateInfo(sat, null, sat, 0).week, 8);
  });

  it("Sun Mar 1 is Sun-first week 9 (starts a new week)", () => {
    assert.equal(getSlotDateInfo(sun, null, sat, 0).week, 9);
  });

  it("Sun Jan 4, 2026 is Sun-first week 1", () => {
    const jan4 = new Date(2026, 0, 4);
    assert.equal(getSlotDateInfo(jan4, null, sat, 0).week, 1);
  });
});

describe("getSlotDateInfo – week number weekStart=1 (explicit)", () => {
  it("Sat Feb 28 is Mon-first week 9", () => {
    assert.equal(getSlotDateInfo(sat, null, sat, 1).week, 9);
  });

  it("Sun Mar 1 is still Mon-first week 9", () => {
    assert.equal(getSlotDateInfo(sun, null, sat, 1).week, 9);
  });
});

// ---------------------------------------------------------------------------
// nowOverride default (no override → uses real clock)
// ---------------------------------------------------------------------------
describe("getSlotDateInfo – no nowOverride", () => {
  it("returns an object with all expected keys", () => {
    const result = getSlotDateInfo(sat, null);
    const keys = [
      "isSameYear",
      "isSameMonth",
      "isSameWeek",
      "isToday",
      "nowInRange",
      "isPassed",
      "weekday",
      "year",
      "month",
      "day",
      "week",
      "dayOfYear"
    ];

    for (const key of keys) {
      assert.ok(Object.hasOwn(result, key), `missing key: ${key}`);
    }
  });
});
