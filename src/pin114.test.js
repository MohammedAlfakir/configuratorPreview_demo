// Reproduce config 114: seed OV_HEIGHT=2397 (within range) and check it survives.
import React from "react";
import { render, waitFor } from "@testing-library/react";
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

test("114: OV_HEIGHT=2397 survives (pinned, within range)", async () => {
  const seed = { OV_SECTION: { OV_FORM: { fields: [ { name: "OV_HEIGHT", value: "2397" } ] } } };
  const emissions = [];
  render(React.createElement(ConfiguratorPreviewDialog, {
    configuratorJson: data,
    initialValues: seed,
    onNameSetChange: ns => emissions.push(findValue(ns, "OV_HEIGHT")),
    layout: "desktop",
  }));
  await waitFor(() => expect(emissions.length).toBeGreaterThan(0));
  // give the iterative solver / effects time to settle
  await new Promise(r => setTimeout(r, 200));
  // eslint-disable-next-line no-console
  console.log("OV_HEIGHT emissions:", emissions);
  const final = emissions[emissions.length - 1];
  // eslint-disable-next-line no-console
  console.log("FINAL OV_HEIGHT =", final);
  expect(final).toBe("2397");
});
