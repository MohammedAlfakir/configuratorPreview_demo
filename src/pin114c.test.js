// Reproduce the EXACT App Load flow: first mount WITHOUT seed (key v0),
// then remount WITH seed via key change (v1) — like clicking "Load my data".
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

let triggerLoad;
function App({ onEmit, seed }) {
  const [seedValues, setSeedValues] = useState(null);
  const [nonce, setNonce] = useState(0);
  triggerLoad = () => { setSeedValues(seed); setNonce(n => n + 1); };
  return React.createElement(ConfiguratorPreviewDialog, {
    key: `114-${nonce}`,
    configuratorJson: data,
    initialValues: seedValues ?? undefined,
    onNameSetChange: ns => onEmit(findValue(ns, "OV_HEIGHT")),
    layout: "desktop",
  });
}

test("114 Load-remount: seed applies on the SECOND mount", async () => {
  const seed = { OV_SECTION: { OV_FORM: { fields: [ { name: "OV_HEIGHT", value: "2397" } ] } } };
  const emissions = [];
  render(React.createElement(App, { seed, onEmit: v => emissions.push(v) }));
  // first mount (no seed) settles
  await waitFor(() => expect(emissions.length).toBeGreaterThan(0));
  await act(async () => { await new Promise(r => setTimeout(r, 100)); });
  const beforeLoad = emissions[emissions.length - 1];

  // click "Load my data"
  await act(async () => { triggerLoad(); await new Promise(r => setTimeout(r, 300)); });
  const afterLoad = emissions[emissions.length - 1];

  // eslint-disable-next-line no-console
  console.log("before Load OV_HEIGHT =", beforeLoad, " | after Load =", afterLoad);
  // eslint-disable-next-line no-console
  console.log("all emissions:", emissions);
  expect(afterLoad).toBe("2397");
});
