const nodeIcal = require("node-ical");

const normalizeEmail = (rawEmail) => (rawEmail || "").replace(/^mailto:/iu, "");

/**
 * Extract a plain string from a node-ical property value.
 * Properties with parameters (e.g. SUMMARY;LANGUAGE=de:) are returned as
 * { params: {...}, val: "..." } objects instead of plain strings.
 */
const stringValue = (v) => {
  if (typeof v === "string") {
    return v || null;
  }

  if (v && typeof v === "object" && typeof v.val === "string") {
    return v.val || null;
  }

  return null;
};

const obfuscateEmail = (email) => {
  if (!email.includes("@")) {
    return email;
  }

  const [localPart, domain] = email.split("@");
  const topLevel = domain.includes(".") ? domain.slice(domain.lastIndexOf(".")) : "";
  return `${localPart}@***${topLevel}`;
};

const wrapDate = (date) => ({
  toJSDate: () => date
});

const wrapDuration = (seconds) => ({
  toSeconds: () => seconds
});

const getEventProperty = (event, propertyName) => {
  if (!event || !propertyName) {
    return null;
  }

  const lowerCaseName = propertyName.toLowerCase();
  const upperCaseName = propertyName.toUpperCase();
  const strippedXPrefixUpperCase = upperCaseName.replace(/^X-/u, "");

  if (Object.hasOwn(event, lowerCaseName)) {
    return event[lowerCaseName];
  }

  if (Object.hasOwn(event, upperCaseName)) {
    return event[upperCaseName];
  }

  if (Object.hasOwn(event, strippedXPrefixUpperCase)) {
    return event[strippedXPrefixUpperCase];
  }

  return null;
};

const createComponentAdapter = (event) => ({
  getFirstPropertyValue: (propertyName) => {
    const value = getEventProperty(event, propertyName);
    return stringValue(value);
  }
});

const getAllDayDurationSeconds = (startDate, endDate) => {
  const rawDayCount = (endDate.getTime() - startDate.getTime()) / 86400000;
  const dayCount = Math.max(1, Math.round(rawDayCount));
  return dayCount * 86400;
};

const getDurationSeconds = (event) => {
  const startDate = event?.start instanceof Date ? event.start : null;
  const endDate = event?.end instanceof Date ? event.end : null;

  if (!startDate || !endDate) {
    return 0;
  }

  if (event?.isFullDay || event?.start?.dateOnly || event?.end?.dateOnly) {
    return getAllDayDurationSeconds(startDate, endDate);
  }

  return Math.max(0, Math.floor((endDate.getTime() - startDate.getTime()) / 1000));
};

/**
 * Extract attendees from a node-ical event
 * @param {Object} event - The node-ical event object
 * @returns {Array} Array of attendee objects with name, email, and status
 */
const extractAttendees = (event) => {
  if (!event?.attendee) {
    return [];
  }

  const attendees = Array.isArray(event.attendee) ? event.attendee : [event.attendee];
  return attendees.map((attendee) => {
    const params = typeof attendee === "object" && attendee ? attendee.params || {} : {};
    const rawEmail =
      typeof attendee === "string"
        ? attendee
        : attendee?.val || "";
    const email = normalizeEmail(rawEmail);
    const displayEmail = obfuscateEmail(email);
    const name = params.CN || params.cn;
    const status = params.PARTSTAT || params.partstat || "NEEDS-ACTION";
    const role = params.ROLE || params.role || "REQ-PARTICIPANT";

    return {
      name: name || displayEmail,
      email: displayEmail,
      status,
      role
    };
  });
};

/**
 * Parse iCal data and expand recurring events using node-ical
 * @param {string} iCalData - The iCal data string
 * @param {Date} startDate - Start date for event range
 * @param {Date} endDate - End date for event range
 * @param {number} maxIterations - Maximum iterations for recurring events
 * @returns {Object} Object containing events and occurrences arrays
 */
const parseAndExpandEvents = (iCalData, startDate, endDate, maxIterations = 1000) => {
  let parsedCalendar;
  try {
    parsedCalendar = nodeIcal.sync.parseICS(iCalData);
  } catch (error) {
    throw new Error("Failed to parse iCal data", {
      cause: error
    });
  }

  const vevents = Object.values(parsedCalendar).filter((entry) => entry?.type === "VEVENT");
  if (vevents.length === 0) {
    throw new Error("Failed to parse iCal data");
  }

  const events = [];
  const occurrences = [];

  for (const event of vevents) {
    const component = createComponentAdapter(event);
    const attendees = extractAttendees(event);
    const isRecurring = Boolean(event.rrule);

    if (isRecurring) {
      const expanded = nodeIcal.expandRecurringEvent(event, {
        from: startDate,
        to: endDate,
        excludeExdates: true,
        includeOverrides: true
      });

      const limitedOccurrences = expanded.slice(0, Math.max(0, maxIterations));
      for (const occurrence of limitedOccurrences) {
        const occurrenceComponent = createComponentAdapter(occurrence);
        const durationSeconds = getDurationSeconds(occurrence);
        const duration = wrapDuration(durationSeconds);
        const normalizedOccurrenceEndDate = new Date(
          occurrence.start.getTime() + (durationSeconds * 1000)
        );

        const occurrenceEvent = occurrence.event || {};
        occurrences.push({
          startDate: wrapDate(occurrence.start),
          endDate: wrapDate(normalizedOccurrenceEndDate),
          item: {
            summary: stringValue(occurrence.summary) || stringValue(occurrenceEvent.summary),
            location: stringValue(occurrence.location) || stringValue(occurrenceEvent.location),
            description: stringValue(occurrence.description) || stringValue(occurrenceEvent.description),
            uid: stringValue(occurrence.uid) || stringValue(occurrenceEvent.uid),
            isRecurring: () => true,
            duration,
            component: occurrenceComponent,
            attendees: extractAttendees(occurrenceEvent)
          },
          component: occurrenceComponent
        });
      }
    } else {
      const eventStartDate = event.start;
      const eventEndDate = event.end;

      if (eventStartDate instanceof Date && eventEndDate instanceof Date && eventEndDate >= startDate && eventStartDate <= endDate) {
        events.push({
          startDate: wrapDate(eventStartDate),
          endDate: wrapDate(eventEndDate),
          summary: stringValue(event.summary),
          location: stringValue(event.location),
          description: stringValue(event.description),
          uid: stringValue(event.uid),
          isRecurring: () => false,
          duration: wrapDuration(getDurationSeconds(event)),
          component,
          attendees
        });
      }
    }
  }

  return {
    events,
    occurrences
  };
};

module.exports = {
  parseAndExpandEvents
};
