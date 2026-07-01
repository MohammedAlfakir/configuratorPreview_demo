// Does a SLIDER (Input with range) hold a pinned value strictly inside its range?
import React from "react";
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

test("114 slider OV_HEIGHT=2500 (well inside 2260..3000) holds", async () => {
  const seed = { OV_SECTION: { OV_FORM: { fields: [ { name: "OV_HEIGHT", value: "2500" } ] } } };
  const emissions = [];
  render(React.createElement(ConfiguratorPreviewDialog, {
    configuratorJson: data,
    initialValues: seed,
    onNameSetChange: ns => emissions.push(findValue(ns, "OV_HEIGHT")),
    layout: "desktop",
  }));
  await waitFor(() => expect(emissions.length).toBeGreaterThan(0));
  await act(async () => { await new Promise(r => setTimeout(r, 300)); });
  // eslint-disable-next-line no-console
  console.log("SLIDER OV_HEIGHT emissions:", emissions, "FINAL:", emissions[emissions.length-1]);
  expect(emissions[emissions.length - 1]).toBe("2500");
});
