const assert = require("node:assert/strict");
const {after, describe, it} = require("node:test");

let moduleDefinition;
const hasOriginalModule = Object.hasOwn(globalThis, "Module");
const originalModule = globalThis.Module;
const hasOriginalLog = Object.hasOwn(globalThis, "Log");
const originalLog = globalThis.Log;
const errorMessages = [];
globalThis.Module = {
  register: (_name, definition) => {
    moduleDefinition = definition;
  }
};
globalThis.Log = {
  error: (message) => errorMessages.push(message)
};
require("../MMM-CalendarExt2.js");
if (hasOriginalModule) {
  globalThis.Module = originalModule;
} else {
  delete globalThis.Module;
}
after(() => {
  if (hasOriginalLog) {
    globalThis.Log = originalLog;
  } else {
    delete globalThis.Log;
  }
});

const createModule = (config = {}) => Object.assign(Object.create(moduleDefinition), {
  config: {
    ...moduleDefinition.defaults,
    ...config
  }
});

const testInvalidModuleInterval = (name) => {
  it(`logs and defaults string ${name}`, () => {
    errorMessages.length = 0;
    const instance = createModule({[name]: "1000*60"});
    instance.initConfig();

    assert.equal(instance.config[name], moduleDefinition.defaults[name]);
    assert.equal(errorMessages.length, 1);
    assert.ok(errorMessages[0].includes(name));
  });
};

describe("config interval validation", () => {
  for (const name of ["firstDrawingDelay", "updateInterval", "rotateInterval"]) {
    testInvalidModuleInterval(name);
  }

  it("logs and defaults string calendar scanInterval", () => {
    errorMessages.length = 0;
    const instance = createModule({
      calendars: [
        {
          name: "Work",
          scanInterval: "1000*60"
        }
      ]
    });
    instance.initConfig();

    assert.equal(instance.config.calendars[0].scanInterval, moduleDefinition.predefined.calendar.scanInterval);
    assert.equal(errorMessages.length, 1);
    assert.ok(errorMessages[0].includes("calendars[0].scanInterval"));
  });

  it("accepts numeric intervals", () => {
    errorMessages.length = 0;
    const instance = createModule({
      firstDrawingDelay: 1000,
      updateInterval: 60_000,
      rotateInterval: 60_000,
      calendars: [
        {
          name: "Work",
          scanInterval: 1_800_000
        }
      ]
    });
    instance.initConfig();

    assert.equal(errorMessages.length, 0);
  });
});
