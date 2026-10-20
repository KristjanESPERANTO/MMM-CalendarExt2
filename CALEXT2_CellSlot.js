import {Slot} from "./CALEXT2_Slot.js";

export class CellSlot extends Slot {
  constructor (view, period, daySeq = 0, weekSeq = 0) {
    super(view, period, daySeq);
    this.start = period.start;
    this.end = period.end;
    this.seq = daySeq;
    this.daySeq = daySeq;
    this.weekSeq = weekSeq;
    this.makeSlotDomClass(view, daySeq, weekSeq);
  }

  init (view) {
    this.makeDom();
    this.makeSlotHeader(view);
    CellSlot.adjustSlotHeight(view, this.contentDom);
  }

  static adjustSlotHeight (view, dom) {
    view.adjustSlotHeight(dom);
  }

  makeSlotHeader (view) {
    view.makeSlotHeader(this);
  }

  makeSlotDomClass (view, daySeq, weekSeq) {
    view.makeCellDomClass(this, daySeq, weekSeq);
    this.dom.classList.add("cellSlot");
  }
}
