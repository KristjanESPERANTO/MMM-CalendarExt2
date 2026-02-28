/* global dayjs SlotDateHelpers */
// eslint-disable-next-line no-unused-vars, no-undef
class ViewWeekly extends ViewPeriod {
  constructor (config, events) {
    super(config, events);
    this.slotUnit = "week";
  }

  makeSlotDomClass (slot) {
    const slotDom = slot.dom;
    super.makeSlotDomClass(slot);
    slotDom.classList.add("weekly");

    const info = SlotDateHelpers.getSlotDateInfo(slot.start.toDate(), slot.end.toDate(), null, this.config.weekStart);
    if (info.isSameYear) slotDom.classList.add("thisyear");
    if (info.isSameMonth) slotDom.classList.add("thismonth");
    if (info.isSameWeek) slotDom.classList.add("thisweek");
    if (info.nowInRange) slotDom.classList.add("today");
    slotDom.classList.add(`year_${info.year}`);
    slotDom.classList.add(`month_${info.month}`);
    slotDom.classList.add(`week_${info.week}`);
  }

  makeSlotHeader (slot) {
    const header = slot.headerDom;
    const title = header.querySelector(".slotTitle");
    const subTitle = header.querySelector(".slotSubTitle");
    if (this.config.slotTitle) {
      title.innerHTML = this.config.slotTitle;
    } else if (
      this.config.slotTitleFormat &&
      typeof this.config.slotTitleFormat !== "object"
    ) {
      const startDay = this.locale ? dayjs(slot.start).locale(this.locale) : dayjs(slot.start);
      title.innerHTML = startDay.format(this.config.slotTitleFormat);
    } else {
      const startDay = this.locale ? dayjs(slot.start).locale(this.locale) : dayjs(slot.start);
      title.innerHTML = startDay.calendar(null, this.config.slotTitleFormat);
    }
    if (this.config.slotSubTitle) {
      subTitle.innerHTML = this.config.slotSubTitle;
    } else if (
      this.config.slotSubTitleFormat &&
      typeof this.config.slotSubTitleFormat !== "object"
    ) {
      const startDay = this.locale ? dayjs(slot.start).locale(this.locale) : dayjs(slot.start);
      subTitle.innerHTML = startDay.format(this.config.slotSubTitleFormat);
    } else {
      const startDay = this.locale ? dayjs(slot.start).locale(this.locale) : dayjs(slot.start);
      subTitle.innerHTML = startDay.calendar(null, this.config.slotSubTitleFormat);
    }
  }
}
