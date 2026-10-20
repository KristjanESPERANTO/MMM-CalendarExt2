import {View} from "./CALEXT2_View.js";

export class ViewPeriod extends View {
  makeSlotDomClass (slot) {
    const slotDom = slot.dom;
    super.makeSlotDomClass(slot);
    slotDom.classList.add("period");
  }

  viewDomType (viewDom) {
    viewDom.classList.add(this.config.type);
  }

  adjustSlotWidth (slotDom, count) {
    if (this.config.type === "row") slotDom.style.width = `${100 / count - 3}%`;
  }
}
