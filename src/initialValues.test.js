import { render, screen, waitFor } from "@testing-library/react";
import { ConfiguratorPreviewDialog } from "@oak-some/configurator-previewer";
import exportJson from "./__fixtures__/exp107.json";

// Configurator 107 (Shape_F_V07) is the reproduction case: 2 of its 17 option
// sources emit values as JSON numbers rather than strings, so a caller seeding
// the string "1" used to fall through the strict `o.value === storedVal` check
// and get replaced by filteredOptions[0]. See previewer 1.18.1.
const exportData = exportJson.data;

// The exact payload the integrating team passes — every value a string, which is
// the sensible convention and what the other ~110 fields require.
const TEAM_INITIAL_VALUES = {
  INSTALLATION_TYPE: "BUILT_IN",
  ZF_HEIGHT: "2500",
  ZF_WIDTH: "3000",
  ZF_DEPTH: "500",
  ZF_CNT: "5",
  FILLER_TOP: "80",
  FILLER_LEFT: "50",
  FILLER_RIGHT: "50",
  FILLER_BOTTOM: "80",
  ZF_COLLECTION: "COLLECTION_01",
  ZF_FRONT_TYPE: "FR_01_LAM",
  ZF_CAT_COLOR: "CAT_01_MEL",
  ZF_FINISH_INT: "DE_S4_01",
  ZF_PULL: "BE_HN_81061100",
  ZF_HW_COLOR: "BLACK",
  // The field under test: source SR-64600860 has numeric option values.
  ZF_MODULE: "1",
  // Also numeric-sourced (SR-0548a025).
  ZF_COL01_SELECTED_SUB_ZONE: "1",
  ZF_COL01_DOOR_TYPE: "SD",
  ZF_COL01_LAYOUT: "WACA_LY_D",
  ZF_COL01_Z1_TYPE: "AS",
  ZF_COL01_Z1_SUB_ART: "IAS",
  ZF_COL01_Z2_SUB_ART: "IAS",
  ZF_COL01_OPENING: "LEFT",
};

const renderWithValues = initialValues =>
  render(
    <ConfiguratorPreviewDialog
      configuratorJson={exportData}
      initialValues={initialValues}
      layout="desktop"
    />,
  );

// Collect the flat name -> value map the previewer emits once it has settled.
const emittedValues = async initialValues => {
  let latest = null;
  render(
    <ConfiguratorPreviewDialog
      configuratorJson={exportData}
      initialValues={initialValues}
      onNameSetChange={names => {
        latest = names;
      }}
      layout="desktop"
    />,
  );
  await waitFor(() => expect(latest).not.toBeNull());
  return latest;
};

describe("numeric-sourced option values (previewer 1.18.1)", () => {
  it("keeps a string seed for ZF_MODULE, whose source emits numbers", async () => {
    const names = await emittedValues(TEAM_INITIAL_VALUES);

    // Before the fix this came back as the substituted first option, not "1".
    expect(String(names.ZF_MODULE)).toBe("1");
  });

  it("keeps a string seed for a SELECTED_SUB_ZONE field", async () => {
    const names = await emittedValues(TEAM_INITIAL_VALUES);

    expect(String(names.ZF_COL01_SELECTED_SUB_ZONE)).toBe("1");
  });

  it("still honours seeds from ordinary string-valued sources", async () => {
    const names = await emittedValues(TEAM_INITIAL_VALUES);

    // Regression guard: the ~110 string-sourced fields must be unaffected.
    expect(names.ZF_HW_COLOR).toBe("BLACK");
    expect(names.ZF_COL01_Z1_SUB_ART).toBe("IAS");
    expect(names.INSTALLATION_TYPE).toBe("BUILT_IN");
  });

  it("renders without crashing on the numeric source", () => {
    // parseValue() calls raw.startsWith(), which throws a TypeError on a number.
    expect(() => renderWithValues(TEAM_INITIAL_VALUES)).not.toThrow();
    expect(screen.queryAllByText(/\(no options\)/).length).toBe(0);
  });
});
