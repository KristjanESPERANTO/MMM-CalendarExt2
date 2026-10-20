import {ViewAgenda} from "./CALEXT2_ViewAgenda.js";

const dayjs = globalThis.dayjs;

export class ViewUpcoming extends ViewAgenda {
  makeSlotDomClass (slot) {
    const slotDom = slot.dom;
    super.makeSlotDomClass(slot);
    slotDom.classList.add("upcoming");
  }

  filterEvents (events) {
    const until = dayjs().add(this.config.maxDays, "day").endOf("day");
    let filtered = super.filterEvents(events);
    filtered = filtered.filter((e) =>
      dayjs.unix(e.startDate).isBetween(dayjs(), until, null, "[)"));
    return filtered;
  }
}
