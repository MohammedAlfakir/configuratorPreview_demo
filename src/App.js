import { useState } from "react";
import { ConfiguratorPreviewDialog } from "@oak-some/configurator-previewer";

const CONFIGS = [
  {
    label: "Shape_U_V05-v1.0.0",
    value: "/Shape_U_V05-v1.0.0.json",
  },
  {
    label: "Shape CMB V02",
    value: "/Shape_CMB_V02-v1.0.0.json",
  },
  { label: "Shape U", value: "/shapeU-v1.0.0.json" },
  { label: "Shape CMB", value: "/shapeCMB-v1.0.0.json" },
  { label: "Configurator", value: "/configurator-v1.0.0.json" },

  {
    label: "Shape_F_V07-v1.0.0",
    value: "/Shape_F_V07-v1.0.0.json",
  },
];

function App() {
  const [selected, setSelected] = useState(CONFIGS[0].value);

  return (
    <>
      <div
        style={{
          position: "fixed",
          bottom: 16,
          right: 16,
          zIndex: 9999,
          display: "flex",
          gap: 8,
          background: "rgba(255,255,255,0.95)",
          border: "1px solid #e2e8f0",
          borderRadius: 10,
          padding: "8px 12px",
          boxShadow: "0 2px 12px rgba(0,0,0,0.12)",
          alignItems: "center",
        }}
      >
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "#64748b",
            marginRight: 4,
          }}
        >
          Configurator
        </span>
        {CONFIGS.map(cfg => (
          <button
            key={cfg.value}
            onClick={() => setSelected(cfg.value)}
            style={{
              padding: "5px 12px",
              borderRadius: 6,
              border: "none",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: selected === cfg.value ? 600 : 400,
              background: selected === cfg.value ? "#0f172a" : "#f1f5f9",
              color: selected === cfg.value ? "#fff" : "#475569",
              transition: "all 0.15s",
            }}
          >
            {cfg.label}
          </button>
        ))}
      </div>

      <ConfiguratorPreviewDialog
        key={selected}
        configuratorJson={selected}
        imagePrefix="https://imagedelivery.net/aYYmWUcv7lRhpLdU4ojPsA/"
        // imageSuffix="/public"
        onVariableSetChange={vars => {
          console.log("impactedVariables:", vars);
        }}
        onLabelSetChange={labels => {
          console.log("labels:", labels);
        }}
        onNameSetChange={names => {
          console.log("names:", names);
        }}
        onGoToZone={zone => {
          console.log("goToZone:", zone);
        }}
        layout="desktop"
      />
    </>
  );
}

export default App;
