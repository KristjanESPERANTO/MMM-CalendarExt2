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

  assert.equal(result.events.length, 1);
  assert.equal(result.occurrences.length, 0);

  const [event] = result.events;
  assert.equal(event.summary, "Team Sync");
  assert.equal(event.location, "Office");
  assert.equal(event.description, "Weekly team sync");
  assert.equal(event.uid, "single-1");
  assert.equal(event.isRecurring(), false);

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

  assert.equal(result.events.length, 0);
  assert.equal(result.occurrences.length, 0);
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

  assert.equal(result.events.length, 0);
  assert.equal(result.occurrences.length, 4);

  const starts = result.occurrences.map((occurrence) => occurrence.startDate.toJSDate().toISOString());
  assert.deepEqual(starts, [
    "2026-02-01T10:00:00.000Z",
    "2026-02-02T10:00:00.000Z",
    "2026-02-04T10:00:00.000Z",
    "2026-02-05T10:00:00.000Z"
  ]);

  for (const occurrence of result.occurrences) {
    assert.equal(occurrence.item.isRecurring(), true);
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

  assert.equal(result.occurrences.length, 2);
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

  assert.equal(result.events.length, 1);
  assert.deepEqual(result.events[0].attendees[0], {
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

  assert.equal(result.events.length, 1);

  const event = result.events[0];
  assert.equal(event.summary, "Holiday");
  assert.equal(event.duration.toSeconds(), 86400, "all-day event should be exactly 86400s");

  const startMs = event.startDate.toJSDate().getTime();
  const endMs = event.endDate.toJSDate().getTime();
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

  assert.equal(result.events.length, 1);

  const event = result.events[0];
  assert.equal(
    event.endDate.toJSDate().toISOString(),
    "2026-03-01T11:30:00.000Z"
  );
  assert.equal(event.duration.toSeconds(), 5400, "1.5h = 5400s");
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

  assert.equal(result.occurrences.length, 3);

  for (const occurrence of result.occurrences) {
    assert.equal(occurrence.item.duration.toSeconds(), 86400);

    const startMs = occurrence.startDate.toJSDate().getTime();
    const endMs = occurrence.endDate.toJSDate().getTime();
    assert.equal(endMs - startMs, 86400000);
  }
});
