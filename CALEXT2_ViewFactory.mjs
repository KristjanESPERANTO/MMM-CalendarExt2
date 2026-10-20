import {ViewCurrent} from "./CALEXT2_ViewCurrent.js";
import {ViewDaily} from "./CALEXT2_ViewDaily.js";
import {ViewLegend} from "./CALEXT2_Legend.js";
import {ViewMonth} from "./CALEXT2_ViewMonth.js";
import {ViewMonthly} from "./CALEXT2_ViewMonthly.js";
import {ViewUpcoming} from "./CALEXT2_ViewUpcoming.js";
import {ViewWeek} from "./CALEXT2_ViewWeek.js";
import {ViewWeekly} from "./CALEXT2_ViewWeekly.js";

const viewClasses = {
  "current": ViewCurrent,
  "upcoming": ViewUpcoming,
  "month": ViewMonth,
  "daily": ViewDaily,
  "weekly": ViewWeekly,
  "monthly": ViewMonthly,
  "week": ViewWeek,
  "legend": ViewLegend
};

export const makeView = (config, events) => {

  const ViewClass = viewClasses[config.mode] || ViewWeek;
  return new ViewClass(
    config,
    events
  );

};
