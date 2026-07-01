// Verifies initialValues are pinned (loaded verbatim, not clamped) on first render.
import React from "react";
import { render, waitFor } from "@testing-library/react";
import { ConfiguratorPreviewDialog } from "@oak-some/configurator-previewer";
import exp121 from "./exp121.json";

// jsdom has no matchMedia; the dialog's responsive hook calls it.
beforeAll(() => {
  if (!global.ResizeObserver) {
    global.ResizeObserver = class {
      observe() {} unobserve() {} disconnect() {}
    };
  }
  if (!window.matchMedia) {
    window.matchMedia = q => ({
      matches: false, media: q, onchange: null,
      addEventListener: () => {}, removeEventListener: () => {},
      addListener: () => {}, removeListener: () => {}, dispatchEvent: () => false,
    });
  }
});

const data = exp121.data ?? exp121;

function findValue(nameSet, name) {
  let found;
  const walk = node => {
    for (const f of node.fields ?? []) if (f.name === name) found = f.value;
    for (const k of Object.keys(node)) if (k !== "fields") walk(node[k]);
  };
  for (const k of Object.keys(nameSet || {})) walk(nameSet[k]);
  return found;
}

test("pinned initialValues load verbatim (OV_WIDTH out of computed range)", async () => {
  const seed = {
    OV_SECTION: {
      OV_FORM: {
        fields: [
          { name: "OV_WIDTH", value: "8000" },         // min≈6400 → would clamp if NOT pinned
          { name: "INSTALLATION_TYPE", value: "FREE_STANDING" },
        ],
      },
    },
  };

  let lastNameSet = null;
  try {
    render(
      React.createElement(ConfiguratorPreviewDialog, {
        configuratorJson: data,
        initialValues: seed,
        onNameSetChange: ns => { lastNameSet = ns; },
        layout: "desktop",
      })
    );
  } catch (e) {
    // eslint-disable-next-line no-console
    console.log("RENDER ERROR:", e && e.errors ? e.errors.map(x => x.message) : e.message);
    throw e;
  }

  await waitFor(() => expect(lastNameSet).not.toBeNull());

  const ovWidth = findValue(lastNameSet, "OV_WIDTH");
  const install = findValue(lastNameSet, "INSTALLATION_TYPE");
  // eslint-disable-next-line no-console
  console.log("RESULT OV_WIDTH =", ovWidth, " INSTALLATION_TYPE =", install);

  expect(ovWidth).toBe("8000");           // verbatim, NOT clamped to 6400
  expect(install).toBe("FREE_STANDING");
});

test("a field with NO initialValue still clamps normally (not pinned)", async () => {
  // No seed at all → OV_WIDTH should settle to its computed value, not stay arbitrary.
  let lastNameSet = null;
  render(
    React.createElement(ConfiguratorPreviewDialog, {
      configuratorJson: data,
      onNameSetChange: ns => { lastNameSet = ns; },
      layout: "desktop",
    })
  );
  await waitFor(() => expect(lastNameSet).not.toBeNull());
  const ovWidth = Number(findValue(lastNameSet, "OV_WIDTH"));
  // eslint-disable-next-line no-console
  console.log("NO-SEED OV_WIDTH =", ovWidth);
  // Unpinned: defaultValue (12000) is clamped into [min≈6400, max 9000] → ends at 9000.
  // The point: it is clamped to the range, NOT left at the raw 12000.
  expect(ovWidth).toBeGreaterThanOrEqual(6400);
  expect(ovWidth).toBeLessThanOrEqual(9000);
});
