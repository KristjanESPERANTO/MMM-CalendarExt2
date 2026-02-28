/* global SlotDateHelpers ViewPeriod */
// eslint-disable-next-line no-unused-vars
class ViewDaily extends ViewPeriod {
  constructor (config, events) {
    super(config, events);
    this.slotUnit = "day";
  }

  makeSlotDomClass (slot) {
    const slotDom = slot.dom;
    super.makeSlotDomClass(slot);
    slotDom.classList.add("daily");

    const info = SlotDateHelpers.getSlotDateInfo(slot.start.toDate(), null);
    if (info.isSameYear) slotDom.classList.add("thisyear");
    if (info.isSameMonth) slotDom.classList.add("thismonth");
    if (info.isSameWeek) slotDom.classList.add("thisweek");
    if (info.isToday) slotDom.classList.add("today");
    if (info.isPassed) slotDom.classList.add("passed");
    slotDom.classList.add(`weekday_${info.weekday}`);
    slotDom.classList.add(`year_${info.year}`);
    slotDom.classList.add(`month_${info.month}`);
    slotDom.classList.add(`day_${info.day}`);
    slotDom.classList.add(`week_${info.week}`);
    slotDom.classList.add(`dayofyear_${info.dayOfYear}`);
  }
}
