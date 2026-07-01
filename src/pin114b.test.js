// Reproduce the App flow: seeded mount + parent re-renders (as setLiveNames triggers).
import React, { useState } from "react";
import { render, waitFor, act } from "@testing-library/react";
import { ConfiguratorPreviewDialog } from "@oak-some/configurator-previewer";
import exp114 from "./exp114.json";

const data = exp114.data ?? exp114;

beforeAll(() => {
  if (!global.ResizeObserver) global.ResizeObserver = class { observe(){} unobserve(){} disconnect(){} };
  if (!window.matchMedia) window.matchMedia = q => ({ matches:false, media:q, addEventListener(){}, removeEventListener(){}, addListener(){}, removeListener(){}, dispatchEvent(){return false;} });
});

function findValue(ns, name) {
  let found;
  const walk = n => { for (const f of n.fields ?? []) if (f.name === name) found = f.value; for (const k of Object.keys(n)) if (k!=="fields") walk(n[k]); };
  for (const k of Object.keys(ns||{})) walk(ns[k]);
  return found;
}

// Mirror App.js: seedValues passed to initialValues, onNameSetChange -> setLiveNames (re-render).
function Harness({ seed, onEmit }) {
  const [, setLiveNames] = useState(null);
  return React.createElement(ConfiguratorPreviewDialog, {
    configuratorJson: data,
    initialValues: seed,
    onNameSetChange: ns => { setLiveNames(ns); onEmit(findValue(ns, "OV_HEIGHT")); },
    layout: "desktop",
  });
}

test("114 App-flow: OV_HEIGHT=2397 survives parent re-renders", async () => {
  const seed = { OV_SECTION: { OV_FORM: { fields: [ { name: "OV_HEIGHT", value: "2397" } ] } } };
  const emissions = [];
  render(React.createElement(Harness, { seed, onEmit: v => emissions.push(v) }));
  await waitFor(() => expect(emissions.length).toBeGreaterThan(0));
  await act(async () => { await new Promise(r => setTimeout(r, 300)); });
  // eslint-disable-next-line no-console
  console.log("APP-FLOW OV_HEIGHT emissions:", emissions);
  expect(emissions[emissions.length - 1]).toBe("2397");
});
