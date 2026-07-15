import { useEffect, useState } from "react";
import { ConfiguratorPreviewDialog } from "@oak-some/configurator-previewer";
import * as Prev from "@oak-some/configurator-previewer";
import { CatalogTree } from "@oak-some/catalog-tree";

// Build fingerprint: confirms whether the running bundle is 1.10.3+ (with the
// initialValues pin) or a stale older build. Check this in the browser console.
console.log(
  "PREVIEWER BUILD:",
  Object.keys(Prev).includes("nameSetToIdValues")
    ? "1.10.3+ (pin active)"
    : "OLD (no pin — stale bundle)",
  "| exports:",
  Object.keys(Prev),
);

const CATALOG_API_URL =
  "https://backend.tecnibo.com/digitalfactory/oaksome-api/api/articles/tree";

const exportUrl = id =>
  `https://backend.tecnibo.com/digitalfactory/oaksome-api/api/configurator/${id}/export`;

// localStorage key for a configurator's saved field values, e.g. id 158 -> "configurator-preset-158".
const presetKey = id => `configurator-preset-${id}`;

// --- Console capture ---------------------------------------------------------
// Mirror every console.{log,warn,error,info,debug} call into an in-memory buffer
// so we can dump the full session (including the previewer's internal logs) to a
// file. Patched once at module load, before React mounts.
const LOG_BUFFER = [];
const safeStringify = arg => {
  if (typeof arg === "string") return arg;
  if (arg instanceof Error) return arg.stack || arg.message;
  try {
    return JSON.stringify(
      arg,
      (_k, v) => (typeof v === "bigint" ? v.toString() : v),
      2,
    );
  } catch {
    return String(arg); // circular / non-serializable
  }
};
(function patchConsole() {
  if (typeof window === "undefined" || window.__logCapturePatched) return;
  window.__logCapturePatched = true;
  ["log", "info", "warn", "error", "debug"].forEach(level => {
    const original = console[level].bind(console);
    console[level] = (...args) => {
      LOG_BUFFER.push({
        level,
        // ISO-ish local timestamp without pulling in a date lib.
        t: new Date().toISOString(),
        msg: args.map(safeStringify).join(" "),
      });
      original(...args);
    };
  });
})();

// Top-level section names the previewer's NameSet will use, derived from the export.
// The single root "CONFIGURATOR" structural wrapper is unwrapped — so the effective
// top-level keys are that wrapper's children (matches how onNameSetChange emits).
const liveTopSectionNames = exported => {
  const items = exported?.configurator?.items ?? [];
  const roots =
    items.length === 1 && (items[0].children?.length ?? 0) > 0
      ? items[0].children
      : items;
  return roots.map(it => it.name);
};

function App() {
  const [selectedId, setSelectedId] = useState(null);
  const [configurator, setConfigurator] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | loading | error
  const [error, setError] = useState(null);

  // Latest NameSet emitted by the previewer (for the currently loaded config).
  const [liveNames, setLiveNames] = useState(null);
  // Whether localStorage holds a saved preset for the current configurator id.
  const [hasSavedPreset, setHasSavedPreset] = useState(false);
  // The NameSet we feed back via initialValues — null until "Load my data" is clicked,
  // so we explicitly simulate "entering a saved configurator".
  const [seedValues, setSeedValues] = useState(null);
  // Bumped on Load to force a remount so initialValues is re-read (read only once per mount).
  const [seedNonce, setSeedNonce] = useState(0);
  // Transient confirmation text, e.g. "Saved ✓".
  const [toast, setToast] = useState(null);
  // Diagnostic: warns when a loaded preset's section keys don't match the live config.
  const [seedMismatch, setSeedMismatch] = useState(null);

  useEffect(() => {
    if (selectedId == null) return;

    let cancelled = false;
    setStatus("loading");
    setError(null);
    setConfigurator(null);
    setLiveNames(null);
    // New config: don't seed until the user clicks Load.
    setSeedValues(null);
    setSeedMismatch(null);
    setToast(null);

    fetch(exportUrl(selectedId))
      .then(async res => {
        if (!res.ok) throw new Error(`Export failed (${res.status})`);
        return res.json();
      })
      .then(json => {
        if (cancelled) return;
        // Endpoint returns { message, data: { configurator, sources } }.
        setConfigurator(json.data);
        setStatus("idle");
      })
      .catch(err => {
        if (cancelled) return;
        setError(err.message || "Failed to load configurator");
        setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  // When a configurator is selected, check localStorage for an existing preset.
  useEffect(() => {
    if (selectedId == null) {
      setHasSavedPreset(false);
      return;
    }
    try {
      setHasSavedPreset(localStorage.getItem(presetKey(selectedId)) != null);
    } catch (e) {
      console.warn("localStorage read failed:", e);
      setHasSavedPreset(false);
    }
  }, [selectedId]);

  // Auto-dismiss the toast.
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2000);
    return () => clearTimeout(t);
  }, [toast]);

  // Save the live NameSet to localStorage under configurator-preset-${selectedId}.
  const saveToStorage = () => {
    if (!liveNames || selectedId == null) return;
    try {
      localStorage.setItem(presetKey(selectedId), JSON.stringify(liveNames));
      setHasSavedPreset(true);
      setToast("Saved ✓");
    } catch (e) {
      console.error("localStorage write failed:", e);
      setToast("Save failed");
    }
  };

  // Load the saved NameSet and seed the previewer (remount so initialValues re-reads).
  const loadFromStorage = () => {
    if (selectedId == null) return;
    try {
      const raw = localStorage.getItem(presetKey(selectedId));
      if (raw == null) return;
      const parsed = JSON.parse(raw);

      // Diagnostic: do the saved preset's top-level section keys match the live config?
      const savedKeys = Object.keys(parsed ?? {});
      const liveKeys = liveTopSectionNames(configurator);
      const overlap = savedKeys.filter(k => liveKeys.includes(k));
      console.log("PROP initialValues:", parsed);
      console.log("saved top sections:", savedKeys);
      console.log("live top sections:", liveKeys);
      console.log("overlapping sections:", overlap);
      if (savedKeys.length && overlap.length === 0) {
        setSeedMismatch({ savedKeys, liveKeys });
        console.warn(
          "Preset section names do NOT match this configurator — nothing will seed.",
        );
      } else {
        setSeedMismatch(null);
      }

      setSeedValues(parsed);
      setSeedNonce(n => n + 1); // force remount -> initialValues is re-read
      setToast("Loaded ✓");
    } catch (e) {
      console.error("localStorage load failed:", e);
      setToast("Load failed");
    }
  };

  // Remove the saved preset for the current id and stop seeding.
  const clearStorage = () => {
    if (selectedId == null) return;
    try {
      localStorage.removeItem(presetKey(selectedId));
    } catch (e) {
      console.warn("localStorage remove failed:", e);
    }
    setHasSavedPreset(false);
    setSeedValues(null);
    setSeedMismatch(null);
    setSeedNonce(n => n + 1); // remount with no initialValues -> back to export defaults
    setToast("Cleared ✓");
  };

  // Dump the full captured console buffer (+ current snapshot) to a downloaded file.
  const saveLogs = () => {
    const header = [
      `# Configurator preview — session logs`,
      `Generated: ${new Date().toISOString()}`,
      `Selected configurator id: ${selectedId ?? "(none)"}`,
      `Status: ${status}`,
      `Has saved preset: ${hasSavedPreset}`,
      `Seed mismatch: ${seedMismatch ? "YES" : "no"}`,
      ``,
      `--- Snapshot ---`,
      `liveNames (current NameSet emitted by previewer):`,
      liveNames ? safeStringify(liveNames) : "(none yet)",
      ``,
      `seedValues (initialValues passed to previewer):`,
      seedValues ? safeStringify(seedValues) : "(none — not loaded)",
      ``,
      selectedId != null
        ? (() => {
            try {
              const raw = localStorage.getItem(presetKey(selectedId));
              return `localStorage["${presetKey(selectedId)}"]:\n${raw ?? "(empty)"}`;
            } catch (e) {
              return `localStorage read failed: ${e}`;
            }
          })()
        : `localStorage: (no configurator selected)`,
      ``,
      `--- Console log (${LOG_BUFFER.length} entries) ---`,
      ``,
    ].join("\n");

    const body = LOG_BUFFER.map(
      e => `[${e.t}] ${e.level.toUpperCase()}: ${e.msg}`,
    ).join("\n");

    const text = header + body + "\n";
    try {
      const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `configurator-logs-${selectedId ?? "session"}.txt`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setToast("Logs saved ✓");
    } catch (e) {
      console.error("Saving logs failed:", e);
      setToast("Log save failed");
    }
  };

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      {/* Sidebar */}
      <aside
        style={{
          width: 300,
          flexShrink: 0,
          borderRight: "1px solid #e2e8f0",
          overflowY: "auto",
          padding: 16,
          background: "#fafafa",
        }}
      >
        <h2
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "#64748b",
            textTransform: "uppercase",
            letterSpacing: 0.5,
            margin: "0 0 12px",
          }}
        >
          Catalog
        </h2>
        <CatalogTree
          apiUrl={CATALOG_API_URL}
          onSelect={id => setSelectedId(id)}
          styles={{
            root: {
              style: { fontSize: 14, listStyle: "none", padding: 0, margin: 0 },
            },
            row: { style: { padding: "6px 8px" } },
            catalog: { style: { fontWeight: 700, color: "#1d4ed8" } },
            category: { style: { color: "#475569" } },
            configurator: { style: { color: "#0f172a", borderRadius: 6 } },
            selected: { style: { background: "#e0f2fe", fontWeight: 600 } },
            version: {
              style: { marginLeft: 6, fontSize: 11, color: "#94a3b8" },
            },
            toggle: { style: { marginLeft: "auto", opacity: 0.5 } },
            children: { style: { paddingLeft: 16, listStyle: "none" } },
          }}
        />
      </aside>

      {/* Preview */}
      <main style={{ flex: 1, overflowY: "auto", padding: 24 }}>
        {selectedId == null && (
          <p style={{ color: "#94a3b8" }}>
            Select a configurator from the catalog to preview it.
          </p>
        )}

        {status === "loading" && (
          <p style={{ color: "#64748b" }}>Loading configurator…</p>
        )}

        {status === "error" && (
          <p style={{ color: "#dc2626" }}>Error: {error}</p>
        )}

        {configurator && status === "idle" && (
          <>
            {/* Save / restore controls — fixed bottom-right, compact */}
            <div
              style={{
                position: "fixed",
                bottom: 24,
                right: 24,
                zIndex: 50,
                display: "inline-flex",
                gap: 8,
                alignItems: "center",
                padding: "8px 12px",
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: 8,
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              }}
            >
              <button
                onClick={saveToStorage}
                disabled={!liveNames}
                style={{
                  padding: "6px 12px",
                  borderRadius: 6,
                  border: "none",
                  cursor: liveNames ? "pointer" : "not-allowed",
                  background: "#0f172a",
                  color: "#fff",
                  fontSize: 13,
                }}
              >
                Save
              </button>
              {hasSavedPreset && (
                <button
                  onClick={loadFromStorage}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 6,
                    border: "1px solid #0f172a",
                    cursor: "pointer",
                    background: "#fff",
                    color: "#0f172a",
                    fontSize: 13,
                  }}
                >
                  Load my data
                </button>
              )}
              <button
                onClick={clearStorage}
                disabled={!hasSavedPreset}
                style={{
                  padding: "6px 12px",
                  borderRadius: 6,
                  border: "1px solid #cbd5e1",
                  cursor: hasSavedPreset ? "pointer" : "not-allowed",
                  background: "#fff",
                  color: "#475569",
                  fontSize: 13,
                }}
              >
                Clear saved
              </button>
              <button
                onClick={saveLogs}
                style={{
                  padding: "6px 12px",
                  borderRadius: 6,
                  border: "1px solid #2563eb",
                  cursor: "pointer",
                  background: "#eff6ff",
                  color: "#1d4ed8",
                  fontSize: 13,
                }}
              >
                Save logs
              </button>
              <span style={{ fontSize: 12, color: "#64748b" }}>
                {hasSavedPreset
                  ? `Saved preset exists for #${selectedId}.`
                  : `No saved preset for #${selectedId}.`}
              </span>
              {toast && (
                <span
                  style={{ fontSize: 13, fontWeight: 600, color: "#16a34a" }}
                >
                  {toast}
                </span>
              )}
            </div>

            {seedMismatch && (
              <div
                style={{
                  marginBottom: 16,
                  padding: "10px 12px",
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  borderRadius: 8,
                  fontSize: 12,
                  color: "#991b1b",
                  lineHeight: 1.5,
                }}
              >
                <strong>Preset doesn’t match this configurator.</strong> The
                saved values won’t seed — none of their section names exist in
                this config.
                <br />
                Saved sections: {seedMismatch.savedKeys.join(", ") || "(none)"}
                <br />
                This config’s sections: {seedMismatch.liveKeys.join(", ")}
                <br />
                Fix: <em>Clear saved</em>, change a field, <em>Save</em>, then{" "}
                <em>Load my data</em> — don’t reuse a preset from another
                configurator.
              </div>
            )}

            <ConfiguratorPreviewDialog
              // Remount on config change OR after Load/Clear, so initialValues re-seeds.
              key={`${selectedId}-${seedNonce}`}
              configuratorJson={configurator}
              imagePrefix="https://imagedelivery.net/aYYmWUcv7lRhpLdU4ojPsA/"
              // null until "Load my data" is clicked — explicitly simulates entering a saved config.
              initialValues={seedValues ?? undefined}
              // onVariableSetChange={vars => {
              //   console.log("impactedVariables:", vars);
              // }}
              // onLabelSetChange={labels => {
              //   console.log("labels:", labels);
              // }}
              onGoToZone={zone => {
                console.log("goToZone:", zone);
              }}
              // onNameSetChange={names => {
              //   console.log("names:", names);
              //   setLiveNames(names);
              // }}
              layout="desktop"
            />
          </>
        )}
      </main>
    </div>
  );
}

export default App;
