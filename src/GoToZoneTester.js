import { useMemo, useState } from "react";

// Every section `goToZone` in the export, with whether that section floats —
// so the dropdown only offers zones the previewer can actually resolve.
const sectionZones = exported => {
  const out = [];
  const walk = items => {
    (items ?? []).forEach(it => {
      const zone = it.attributes?.goToZone?.trim();
      if (it.type === "SECTION" && zone) {
        out.push({
          zone,
          name: it.name,
          float: it.attributes?.float?.trim().toLowerCase() === "true",
        });
      }
      walk(it.children);
    });
  };
  walk(exported?.configurator?.items);
  return out;
};

const EDGES = ["top", "left", "right", "bottom"];

// "" → not passed; "20" → 20 (px); anything else ("10%", "2rem") as-is.
const toOffset = raw => {
  const v = raw.trim();
  if (v === "") return undefined;
  return /^-?\d+(\.\d+)?$/.test(v) ? Number(v) : v;
};

const inputStyle = {
  width: "100%",
  padding: "4px 6px",
  border: "1px solid #cbd5e1",
  borderRadius: 4,
  fontSize: 12,
  boxSizing: "border-box",
};

const buttonStyle = (primary = false) => ({
  padding: "5px 10px",
  borderRadius: 6,
  border: primary ? "none" : "1px solid #cbd5e1",
  background: primary ? "#0f172a" : "#fff",
  color: primary ? "#fff" : "#0f172a",
  fontSize: 12,
  cursor: "pointer",
});

/**
 * Drives `previewRef.current.goToZone(...)` by hand, to try the object form:
 * { zone, top, left, right, bottom, visible }. Blank edges are not sent, so a
 * floating section with none keeps the stylesheet's centred default.
 */
export default function GoToZoneTester({ previewRef, configurator }) {
  const zones = useMemo(() => sectionZones(configurator), [configurator]);
  const [zone, setZone] = useState("");
  const [edges, setEdges] = useState({ top: "", left: "", right: "", bottom: "" });
  const [result, setResult] = useState(null);

  const activeZone = zone || zones[0]?.zone || "";

  const call = visible => {
    const request = { zone: activeZone };
    EDGES.forEach(edge => {
      const v = toOffset(edges[edge]);
      if (v !== undefined) request[edge] = v;
    });
    if (visible !== undefined) request.visible = visible;
    const ok = previewRef.current?.goToZone(request) ?? false;
    console.log("goToZone(", request, ") →", ok);
    setResult({ request, ok });
  };

  return (
    <div
      style={{
        position: "fixed",
        bottom: 84,
        right: 24,
        zIndex: 50,
        width: 280,
        padding: 12,
        background: "#f8fafc",
        border: "1px solid #e2e8f0",
        borderRadius: 8,
        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
        fontSize: 12,
        color: "#0f172a",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <strong style={{ fontSize: 13 }}>goToZone tester</strong>

      {zones.length > 0 ? (
        <select
          value={activeZone}
          onChange={e => setZone(e.target.value)}
          style={inputStyle}
        >
          {zones.map(z => (
            <option key={`${z.zone}-${z.name}`} value={z.zone}>
              {z.zone} — {z.name}
              {z.float ? " (float)" : ""}
            </option>
          ))}
        </select>
      ) : (
        <>
          <span style={{ color: "#b45309" }}>
            No section in this configurator has a goToZone. Set one in conf, or
            type a zone:
          </span>
          <input
            value={zone}
            onChange={e => setZone(e.target.value)}
            placeholder="zone"
            style={inputStyle}
          />
        </>
      )}

      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}
      >
        {EDGES.map(edge => (
          <label key={edge} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ color: "#64748b" }}>{edge}</span>
            <input
              value={edges[edge]}
              onChange={e => setEdges(prev => ({ ...prev, [edge]: e.target.value }))}
              placeholder="blank = not sent"
              style={inputStyle}
            />
          </label>
        ))}
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <button
          onClick={() => call(undefined)}
          disabled={!activeZone}
          style={buttonStyle(true)}
        >
          Go
        </button>
        <button onClick={() => call(true)} disabled={!activeZone} style={buttonStyle()}>
          Show
        </button>
        <button onClick={() => call(false)} disabled={!activeZone} style={buttonStyle()}>
          Hide
        </button>
        <button
          onClick={() => setEdges({ top: "", left: "", right: "", bottom: "" })}
          style={buttonStyle()}
        >
          Clear edges
        </button>
      </div>

      {result && (
        <code
          style={{
            display: "block",
            padding: 6,
            background: result.ok ? "#f0fdf4" : "#fef2f2",
            color: result.ok ? "#166534" : "#991b1b",
            borderRadius: 4,
            wordBreak: "break-all",
          }}
        >
          {JSON.stringify(result.request)} → {String(result.ok)}
        </code>
      )}
    </div>
  );
}
