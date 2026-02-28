/* global SlotDateHelpers */
// eslint-disable-next-line no-unused-vars, no-undef
class ViewMonthly extends ViewPeriod {
  constructor (config, events) {
    super(config, events);
    this.slotUnit = "month";
  }

  makeSlotDomClass (slot) {
    const slotDom = slot.dom;
    super.makeSlotDomClass(slot);
    slotDom.classList.add("monthly");
    const info = SlotDateHelpers.getSlotDateInfo(slot.start.toDate(), slot.end.toDate());
    if (info.isSameYear) slotDom.classList.add("thisyear");
    if (info.isSameMonth) slotDom.classList.add("thismonth");
    if (info.nowInRange) slotDom.classList.add("today");
    slotDom.classList.add(`year_${info.year}`);
    slotDom.classList.add(`month_${info.month}`);
  }
}
