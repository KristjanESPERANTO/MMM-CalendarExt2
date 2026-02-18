const config =
  {
    logLevel: ["INFO", "LOG", "WARN", "ERROR", "DEBUG"],
    modules: [
      {

        module: "MMM-CalendarExt2",
        position: "top_left",
        config: {
          views: [
            {
              firstDrawingDelay: 0,
              name: "view1",
              mode: "month",
              slotCount: "7",
              maxItems: "100",
              hideOverflow: false,
              slotMaxHeight: "95px",
              monthFormat: "MMMM YYYY",
              position: "top_right",
              calendars: []
            }
          ],
          scenes: [
            {
              name: "DEFAULT"
            }
          ],
          calendars: [
            {
              url: "https://www.webcal.guru/de-DE/kalender_herunterladen?calendar_instance_id=726"
            },
            {
              url: "https://ics.calendarlabs.com/76/mm3137/US_Holidays.ics"
            }

          ]
        }
      },
      {
        disabled: true,
        module: "MMM-CalendarExt2",
        position: "middle_center",
        config: {
          locale: "de",

          calendars: [
            {
              name: "calendar1",
              url: "https://ics.calendarlabs.com/76/mm3137/US_Holidays.ics"
            }
          ],

          views: [
            {
              name: "week-default",
              mode: "week",
              position: "top_left",
              slotCount: 1,
              slotTitleFormat: "DD.MM.",
              slotSubTitleFormat: "dddd",
              calendars: ["calendar1"]
            },
            {
              name: "week-workaround",
              mode: "week",
              position: "bottom_left",
              slotCount: 1,
              slotTitleFormat: "DD.MM.",
              slotAltTitleFormat: "DD.MM.",
              slotSubTitleFormat: "dddd",
              calendars: ["calendar1"]
            }
          ],

          scenes: [
            {
              name: "Test Scene",
              views: ["week-default", "week-workaround"]
            }
          ]
        }
      }
    ]
  };

/** ************* DO NOT EDIT THE LINE BELOW ***************/
if (typeof module !== "undefined") {
  module.exports = config;
}

