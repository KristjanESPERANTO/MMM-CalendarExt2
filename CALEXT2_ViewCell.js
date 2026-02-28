/* global dayjs SlotDateHelpers View WeekSlot */
// eslint-disable-next-line no-unused-vars
class ViewCell extends View {
  constructor (config, events) {
    super(config, events);
    this.slotUnit = "week";
  }

  makeSlots () {
    this.contentDom.innerHTML = "";
    this.slotPeriods = this.getSlotPeriods();
    this.slots = WeekSlot.factory(this, this.slotPeriods, this.events);
    for (let i = 0; i < this.slots.length; i++) {
      const slot = this.slots[i];
      this.appendSlot(slot);
    }
    this.makeModuleTitle();
  }

  getSlotPeriods () {
    const {showWeekends} = this.config;
    const getSlotPeriod = (tDay, seq) => {
      let mtd = dayjs(tDay);
      if (this.locale) mtd = mtd.locale(this.locale);
      mtd = mtd.add(seq, "week");
      const start = showWeekends
        ? dayjs(mtd).startOf("week")
        : dayjs(mtd).startOf("week").day(1).startOf("day");
      const end = showWeekends
        ? dayjs(mtd).endOf("week")
        : dayjs(mtd).startOf("week").day(5).endOf("day");
      return {
        start,
        end
      };
    };
    const periods = [];
    const targetDay = this.getStartDay();
    const count = this.getSlotCount();
    for (let i = 0; i < count; i++) {
      const period = getSlotPeriod(targetDay, i);
      periods.push(period);
    }
    return periods;
  }

  getSubSlotPeriods (start) {
    const {showWeekends} = this.config;
    const days = showWeekends ? 7 : 5;
    const periods = [];
    const t = start;
    let startDay = dayjs(t);
    if (this.locale) startDay = startDay.locale(this.locale);
    startDay = showWeekends
      ? startDay.startOf("week")
      : startDay.startOf("week").day(1).startOf("day");
    for (let i = 0; i < days; i++) {
      const p = {
        start: dayjs(startDay).startOf("day"),
        end: dayjs(startDay).endOf("day")
      };
      periods.push(p);
      startDay = startDay.add(1, "day");
    }
    return periods;
  }

  makeSlotDomClass (slot) {
    const slotDom = slot.dom;
    super.makeSlotDomClass(slot);
    slotDom.classList.add("weekSlot");
  }

  // eslint-disable-next-line class-methods-use-this
  viewDomType (viewDom) {
    viewDom.classList.add("column");
  }

  adjustSlotHeight (slotDom) {
    slotDom.style.maxHeight = this.config.slotMaxHeight;
    slotDom.style.height = this.config.slotMaxHeight;
  }

  // eslint-disable-next-line class-methods-use-this
  makeCellDomClass (slot, daySeq, weekSeq) {
    const slotDom = slot.dom;
    if (daySeq >= 0) slotDom.classList.add(`cellSeq_${daySeq}`);
    if (weekSeq === 0 && daySeq === 0) {
      slotDom.classList.add("firstCell");
    }
    const info = SlotDateHelpers.getSlotDateInfo(slot.start.toDate(), null);
    if (info.isSameYear) slotDom.classList.add("thisyear");
    if (info.isSameMonth) slotDom.classList.add("thismonth");
    if (info.isSameWeek) slotDom.classList.add("thisweek");
    if (info.isToday) slotDom.classList.add("today");
    if (info.isPassed) slotDom.classList.add("passedday");
    slotDom.classList.add(`weekday_${info.weekday}`);
    slotDom.classList.add(`year_${info.year}`);
    slotDom.classList.add(`month_${info.month}`);
    slotDom.classList.add(`day_${info.day}`);
    slotDom.classList.add(`week_${info.week}`);
    slotDom.classList.add(`dayofyear_${info.dayOfYear}`);
  }

  makeWeeksMark (start) {
    const weeks = document.createElement("div");
    weeks.classList.add("weeksmark");
    const startDay = this.locale ? dayjs(start).locale(this.locale) : dayjs(start);
    weeks.innerHTML = startDay.format(this.config.weeksFormat);
    return weeks;
  }

  // eslint-disable-next-line class-methods-use-this, no-unused-vars
  adjustSlotWidth (slotDom, count) {
    // if (this.config.type == "row") slotDom.style.width = ((100 / count) - 0.25) + "%"
  }

  makeSlotHeader (slot) {
    super.makeSlotHeader(slot);
    const header = slot.headerDom;
    const altTitle = header.querySelector(".slotAltTitle");
    if (this.config.slotAltTitle) {
      altTitle.innerHTML = this.config.slotTitle;
    } else if (this.config.slotAltTitleFormat) {
      const startDay = this.locale ? dayjs(slot.start).locale(this.locale) : dayjs(slot.start);
      altTitle.innerHTML = startDay.format(this.config.slotAltTitleFormat);
    }
  }
}
