import {ViewCell} from "./CALEXT2_ViewCell.js";

const dayjs = globalThis.dayjs;

export class ViewMonth extends ViewCell {
  getSlotCount () {
    const startDay = this.getStartDay();
    const endDay = this.getEndWeek();
    const diff = endDay.diff(startDay, "week");
    return diff + 1;
  }

  getStartDay () {
    const {fromNow} = this.config;
    let now = dayjs();
    if (this.locale) {
      now = now.locale(this.locale);
    }
    return now.add(fromNow, "month").startOf("month").startOf("week");
  }

  getEndWeek () {
    const {fromNow} = this.config;
    let now = dayjs();
    if (this.locale) {
      now = now.locale(this.locale);
    }
    return now.add(fromNow, "month").endOf("month").startOf("week");
  }

  makeSlots () {
    super.makeSlots();
    if (this.config.monthFormat) {
      const {fromNow} = this.config;
      let now = dayjs();
      if (this.locale) now = now.locale(this.locale);
      now.add(fromNow, "month").startOf("month");
      const mt = document.createElement("div");
      mt.innerHTML = now.format(this.config.monthFormat);
      mt.classList.add("monthViewTitle");
      this.contentDom.prepend(mt);
    }
  }
}
