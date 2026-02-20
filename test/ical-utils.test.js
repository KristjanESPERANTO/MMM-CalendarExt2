const assert = require("node:assert/strict");
const test = require("node:test");

const {parseAndExpandEvents} = require("../lib/ical-utils");

const joinIcs = (...lines) => `${lines.join("\n")}\n`;

test("throws a wrapped error for invalid iCal data", () => {
  assert.throws(
    () => parseAndExpandEvents("THIS IS NOT ICS", new Date("2026-01-01"), new Date("2026-01-02")),
    {
      message: "Failed to parse iCal data"
    }
  );
});

test("parses a non-recurring event with attendee extraction and obfuscation", () => {
  const iCalData = joinIcs(
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "BEGIN:VEVENT",
    "UID:single-1",
    "SUMMARY:Team Sync",
    "LOCATION:Office",
    "DESCRIPTION:Weekly team sync",
    "DTSTART:20260301T100000Z",
    "DTEND:20260301T103000Z",
    "ATTENDEE;CN=Jane Doe;PARTSTAT=ACCEPTED;ROLE=OPT-PARTICIPANT:mailto:jane.doe@example.com",
    "END:VEVENT",
    "END:VCALENDAR"
  );

  const result = parseAndExpandEvents(
    iCalData,
    new Date("2026-03-01T00:00:00Z"),
    new Date("2026-03-02T00:00:00Z")
  );

  assert.equal(result.length, 1);

  const [event] = result;
  assert.equal(event.summary, "Team Sync");
  assert.equal(event.location, "Office");
  assert.equal(event.description, "Weekly team sync");
  assert.equal(event.uid, "single-1");
  assert.equal(event.isRecurring, false);

  assert.equal(event.attendees.length, 1);
  assert.deepEqual(event.attendees[0], {
    name: "Jane Doe",
    email: "jane.doe@***.com",
    status: "ACCEPTED",
    role: "OPT-PARTICIPANT"
  });
});

test("ignores non-recurring events outside requested window", () => {
  const iCalData = joinIcs(
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "BEGIN:VEVENT",
    "UID:outside-1",
    "SUMMARY:Outside",
    "DTSTART:20260410T100000Z",
    "DTEND:20260410T110000Z",
    "END:VEVENT",
    "END:VCALENDAR"
  );

  const result = parseAndExpandEvents(
    iCalData,
    new Date("2026-04-01T00:00:00Z"),
    new Date("2026-04-02T00:00:00Z")
  );

  assert.equal(result.length, 0);
});

test("expands recurring events and applies EXDATE exclusions", () => {
  const iCalData = joinIcs(
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "BEGIN:VEVENT",
    "UID:rec-exdate-1",
    "SUMMARY:Daily recurring",
    "DTSTART:20260201T100000Z",
    "DTEND:20260201T103000Z",
    "RRULE:FREQ=DAILY;COUNT=5",
    "EXDATE:20260203T100000Z",
    "END:VEVENT",
    "END:VCALENDAR"
  );

  const result = parseAndExpandEvents(
    iCalData,
    new Date("2026-02-01T00:00:00Z"),
    new Date("2026-02-07T00:00:00Z")
  );

  assert.equal(result.length, 4);

  const starts = result.map((occurrence) => occurrence.start.toISOString());
  assert.deepEqual(starts, [
    "2026-02-01T10:00:00.000Z",
    "2026-02-02T10:00:00.000Z",
    "2026-02-04T10:00:00.000Z",
    "2026-02-05T10:00:00.000Z"
  ]);

  for (const occurrence of result) {
    assert.equal(occurrence.isRecurring, true);
  }
});

test("respects maxIterations for recurring expansion", () => {
  const iCalData = joinIcs(
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "BEGIN:VEVENT",
    "UID:max-iter-1",
    "SUMMARY:Many recurrences",
    "DTSTART:20260201T080000Z",
    "DTEND:20260201T090000Z",
    "RRULE:FREQ=DAILY;COUNT=50",
    "END:VEVENT",
    "END:VCALENDAR"
  );

  const result = parseAndExpandEvents(
    iCalData,
    new Date("2026-02-01T00:00:00Z"),
    new Date("2026-03-01T00:00:00Z"),
    2
  );

  assert.equal(result.length, 2);
});

test("uses default attendee metadata when optional params are missing", () => {
  const iCalData = joinIcs(
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "BEGIN:VEVENT",
    "UID:att-defaults-1",
    "SUMMARY:Minimal attendee",
    "DTSTART:20260601T100000Z",
    "DTEND:20260601T103000Z",
    "ATTENDEE:mailto:someone@example.com",
    "END:VEVENT",
    "END:VCALENDAR"
  );

  const result = parseAndExpandEvents(
    iCalData,
    new Date("2026-06-01T00:00:00Z"),
    new Date("2026-06-02T00:00:00Z")
  );

  assert.equal(result.length, 1);
  assert.deepEqual(result[0].attendees[0], {
    name: "someone@***.com",
    email: "someone@***.com",
    status: "NEEDS-ACTION",
    role: "REQ-PARTICIPANT"
  });
});

test("parses all-day events with correct duration and date span", () => {
  const iCalData = joinIcs(
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "BEGIN:VEVENT",
    "UID:allday-1",
    "SUMMARY:Holiday",
    "DTSTART;VALUE=DATE:20260315",
    "DTEND;VALUE=DATE:20260316",
    "END:VEVENT",
    "END:VCALENDAR"
  );

  const result = parseAndExpandEvents(
    iCalData,
    new Date("2026-03-01T00:00:00Z"),
    new Date("2026-03-31T00:00:00Z")
  );

  assert.equal(result.length, 1);

  const event = result[0];
  assert.equal(event.summary, "Holiday");
  assert.equal(event.isFullDay, true, "all-day event should have isFullDay=true");
  assert.equal(event.duration, 86400, "all-day event should be exactly 86400s");

  const startMs = event.start.getTime();
  const endMs = event.end.getTime();
  assert.equal(endMs - startMs, 86400000, "end - start should be exactly 1 day in ms");
});

test("provides correct endDate and duration for timed events", () => {
  const iCalData = joinIcs(
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "BEGIN:VEVENT",
    "UID:timed-dur-1",
    "SUMMARY:Meeting",
    "DTSTART:20260301T100000Z",
    "DTEND:20260301T113000Z",
    "END:VEVENT",
    "END:VCALENDAR"
  );

  const result = parseAndExpandEvents(
    iCalData,
    new Date("2026-03-01T00:00:00Z"),
    new Date("2026-03-02T00:00:00Z")
  );

  assert.equal(result.length, 1);

  const event = result[0];
  assert.equal(event.isFullDay, false, "timed event should have isFullDay=false");
  assert.equal(
    event.end.toISOString(),
    "2026-03-01T11:30:00.000Z"
  );
  assert.equal(event.duration, 5400, "1.5h = 5400s");
});

test("expands recurring all-day events with correct duration", () => {
  const iCalData = joinIcs(
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "BEGIN:VEVENT",
    "UID:rec-allday-1",
    "SUMMARY:Weekly holiday",
    "DTSTART;VALUE=DATE:20260302",
    "DTEND;VALUE=DATE:20260303",
    "RRULE:FREQ=WEEKLY;COUNT=3",
    "END:VEVENT",
    "END:VCALENDAR"
  );

  const result = parseAndExpandEvents(
    iCalData,
    new Date("2026-03-01T00:00:00Z"),
    new Date("2026-03-31T00:00:00Z")
  );

  assert.equal(result.length, 3);

  for (const occurrence of result) {
    assert.equal(occurrence.isFullDay, true, "recurring all-day should have isFullDay=true");
    assert.equal(occurrence.duration, 86400);

    const startMs = occurrence.start.getTime();
    const endMs = occurrence.end.getTime();
    assert.equal(endMs - startMs, 86400000);
  }
});

test("returns plain strings for properties that carry ICAL parameters (e.g. SUMMARY;LANGUAGE=de)", () => {
  // node-ical returns { params: {...}, val: "..." } for parameterised properties
  // instead of a plain string – stringValue() must unwrap them.
  const iCalData = joinIcs(
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "BEGIN:VEVENT",
    "UID:param-1",
    "SUMMARY;LANGUAGE=de:Team Meeting",
    "LOCATION;ENCODING=QUOTED-PRINTABLE:Büro",
    "DESCRIPTION;LANGUAGE=de:Wöchentliches Meeting",
    "DTSTART:20260301T100000Z",
    "DTEND:20260301T103000Z",
    "END:VEVENT",
    "END:VCALENDAR"
  );

  const result = parseAndExpandEvents(
    iCalData,
    new Date("2026-03-01T00:00:00Z"),
    new Date("2026-03-02T00:00:00Z")
  );

  assert.equal(result.length, 1);
  const ev = result[0];
  assert.equal(typeof ev.summary, "string", "summary must be a plain string");
  assert.equal(typeof ev.location, "string", "location must be a plain string");
  assert.equal(typeof ev.description, "string", "description must be a plain string");
  assert.equal(ev.summary, "Team Meeting");
  assert.equal(ev.location, "Büro");
  assert.equal(ev.description, "Wöchentliches Meeting");
});

test("exposes status=CANCELLED on a non-recurring event", () => {
  const iCalData = joinIcs(
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "BEGIN:VEVENT",
    "UID:cancelled-1",
    "SUMMARY:Cancelled Meeting",
    "STATUS:CANCELLED",
    "DTSTART:20260301T100000Z",
    "DTEND:20260301T103000Z",
    "END:VEVENT",
    "END:VCALENDAR"
  );

  const result = parseAndExpandEvents(
    iCalData,
    new Date("2026-03-01T00:00:00Z"),
    new Date("2026-03-02T00:00:00Z")
  );

  assert.equal(result.length, 1);
  const ev = result[0];
  assert.equal(ev.status, "CANCELLED");
});

test("exposes ms_busystatus for Microsoft X-CDO property", () => {
  const iCalData = joinIcs(
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "BEGIN:VEVENT",
    "UID:oof-1",
    "SUMMARY:OOF Event",
    "X-MICROSOFT-CDO-BUSYSTATUS:OOF",
    "DTSTART:20260301T100000Z",
    "DTEND:20260301T103000Z",
    "END:VEVENT",
    "END:VCALENDAR"
  );

  const result = parseAndExpandEvents(
    iCalData,
    new Date("2026-03-01T00:00:00Z"),
    new Date("2026-03-02T00:00:00Z")
  );

  assert.equal(result.length, 1);
  assert.equal(result[0].ms_busystatus, "OOF");
});

test("exposes status on a recurring occurrence (from parent event)", () => {
  const iCalData = joinIcs(
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "BEGIN:VEVENT",
    "UID:cancelled-rec-1",
    "SUMMARY:Daily Cancelled",
    "STATUS:CANCELLED",
    "DTSTART:20260301T100000Z",
    "DTEND:20260301T103000Z",
    "RRULE:FREQ=DAILY;COUNT=2",
    "END:VEVENT",
    "END:VCALENDAR"
  );

  const result = parseAndExpandEvents(
    iCalData,
    new Date("2026-03-01T00:00:00Z"),
    new Date("2026-03-05T00:00:00Z")
  );

  assert.equal(result.length, 2);
  for (const occurrence of result) {
    assert.equal(occurrence.status, "CANCELLED");
  }
});

test("exposes categories as array on a non-recurring event", () => {
  const iCalData = joinIcs(
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "BEGIN:VEVENT",
    "UID:cat-single-1",
    "SUMMARY:Zahnarzt",
    "CATEGORIES:Health,Important",
    "DTSTART:20260301T100000Z",
    "DTEND:20260301T110000Z",
    "END:VEVENT",
    "END:VCALENDAR"
  );

  const result = parseAndExpandEvents(
    iCalData,
    new Date("2026-03-01T00:00:00Z"),
    new Date("2026-03-02T00:00:00Z")
  );

  assert.equal(result.length, 1);
  assert.deepEqual(result[0].categories, ["Health", "Important"]);
});

test("exposes empty categories array when CATEGORIES is absent", () => {
  const iCalData = joinIcs(
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "BEGIN:VEVENT",
    "UID:cat-absent-1",
    "SUMMARY:No Categories",
    "DTSTART:20260301T100000Z",
    "DTEND:20260301T110000Z",
    "END:VEVENT",
    "END:VCALENDAR"
  );

  const result = parseAndExpandEvents(
    iCalData,
    new Date("2026-03-01T00:00:00Z"),
    new Date("2026-03-02T00:00:00Z")
  );

  assert.equal(result.length, 1);
  assert.deepEqual(result[0].categories, []);
});

test("propagates categories from parent event to recurring occurrences", () => {
  const iCalData = joinIcs(
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "BEGIN:VEVENT",
    "UID:cat-rec-1",
    "SUMMARY:Weekly Meeting",
    "CATEGORIES:Work,Team",
    "DTSTART:20260302T090000Z",
    "DTEND:20260302T100000Z",
    "RRULE:FREQ=WEEKLY;COUNT=3",
    "END:VEVENT",
    "END:VCALENDAR"
  );

  const result = parseAndExpandEvents(
    iCalData,
    new Date("2026-03-01T00:00:00Z"),
    new Date("2026-03-31T00:00:00Z")
  );

  assert.equal(result.length, 3);
  for (const occurrence of result) {
    assert.deepEqual(occurrence.categories, ["Work", "Team"]);
  }
});
