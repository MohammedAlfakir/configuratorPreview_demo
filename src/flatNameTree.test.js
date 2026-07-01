// Proves the library now accepts the compact FlatNameTree shape (nested name:value,
// no `fields` array) DIRECTLY as initialValues — no caller-side transform.
import React from "react";
import { render, waitFor, act } from "@testing-library/react";
import {
  ConfiguratorPreviewDialog,
  isFlatNameTree,
  flatNameTreeToNameSet,
} from "@oak-some/configurator-previewer";
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

// The user's exact shape: fields are bare name:value, sections nest as objects,
// numbers allowed (Z10_CNT), nested COL section.
const userShape = {
  OV_SECTION: {
    OV_FORM: {
      INSTALLATION_TYPE: "BUILT_IN",
      OV_HEIGHT: "2397",                 // export default 2500
      fillers: { FILLER_TOP: "77" },     // default 50
    },
  },
};

test("isFlatNameTree recognizes the shape; flat map and NameSet are NOT flat trees", () => {
  expect(isFlatNameTree(userShape)).toBe(true);
  expect(isFlatNameTree({ OV_HEIGHT: "2397" })).toBe(false); // flat Record
  expect(isFlatNameTree({ OV_SECTION: { OV_FORM: { fields: [{ name: "X", value: "1" }] } } })).toBe(false); // NameSet
});

test("flatNameTreeToNameSet produces a valid NameSet with fields arrays", () => {
  const ns = flatNameTreeToNameSet(userShape);
  expect(ns.OV_SECTION.OV_FORM.fields).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ name: "INSTALLATION_TYPE", value: "BUILT_IN" }),
      expect.objectContaining({ name: "OV_HEIGHT", value: "2397" }),
    ]),
  );
  expect(ns.OV_SECTION.OV_FORM.fillers.fields).toEqual([
    expect.objectContaining({ name: "FILLER_TOP", value: "77" }),
  ]);
});

test("raw FlatNameTree seeds correctly when passed straight to initialValues", async () => {
  let last = null;
  render(
    React.createElement(ConfiguratorPreviewDialog, {
      configuratorJson: data,
      initialValues: userShape, // raw — no transform
      onNameSetChange: ns => { last = ns; },
      layout: "desktop",
    }),
  );
  await waitFor(() => expect(last).not.toBeNull());
  await act(async () => { await new Promise(r => setTimeout(r, 150)); });
  // eslint-disable-next-line no-console
  console.log("FLAT TREE direct -> OV_HEIGHT =", findValue(last, "OV_HEIGHT"),
    "| INSTALLATION_TYPE =", findValue(last, "INSTALLATION_TYPE"),
    "| FILLER_TOP =", findValue(last, "FILLER_TOP"));
  expect(findValue(last, "OV_HEIGHT")).toBe("2397");
  expect(findValue(last, "INSTALLATION_TYPE")).toBe("BUILT_IN");
  expect(findValue(last, "FILLER_TOP")).toBe("77");
});

test("numbers are stringified (Z10_CNT: 6) and nested COL sections resolve", async () => {
  const withNumbers = {
    OV_SECTION: { OV_FORM: { OV_HEIGHT: "2100" } },
  };
  let last = null;
  render(
    React.createElement(ConfiguratorPreviewDialog, {
      configuratorJson: data,
      initialValues: withNumbers,
      onNameSetChange: ns => { last = ns; },
      layout: "desktop",
    }),
  );
  await waitFor(() => expect(last).not.toBeNull());
  await act(async () => { await new Promise(r => setTimeout(r, 150)); });
  expect(findValue(last, "OV_HEIGHT")).toBe("2100");
});
