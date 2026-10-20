import {ViewAgenda} from "./CALEXT2_ViewAgenda.js";

const dayjs = globalThis.dayjs;

export class ViewCurrent extends ViewAgenda {
  makeSlotDomClass (slot) {
    const slotDom = slot.dom;
    super.makeSlotDomClass(slot);
    slotDom.classList.add("current");
  }

  filterEvents (events) {
    let filtered = super.filterEvents(events);
    const now = dayjs();
    filtered = filtered.filter((e) =>
      now.isBetween(dayjs.unix(e.startDate), dayjs.unix(e.endDate), null, "[)"));
    return filtered;
  }
}
