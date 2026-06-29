import { useEffect, useState } from "react";
import { ConfiguratorPreviewDialog } from "@oak-some/configurator-previewer";
import { CatalogTree } from "@oak-some/catalog-tree";

const CATALOG_API_URL =
  "https://backend.tecnibo.com/digitalfactory/oaksome-api/api/articles/tree";

const exportUrl = id =>
  `https://backend.tecnibo.com/digitalfactory/oaksome-api/api/configurator/${id}/export`;

// localStorage key for a configurator's saved field values, e.g. id 158 -> "configurator-preset-158".
const presetKey = id => `configurator-preset-${id}`;

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

  useEffect(() => {
    if (selectedId == null) return;

    let cancelled = false;
    setStatus("loading");
    setError(null);
    setConfigurator(null);
    setLiveNames(null);
    // New config: don't seed until the user clicks Load.
    setSeedValues(null);
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
      setSeedValues(JSON.parse(raw));
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
    setSeedNonce(n => n + 1); // remount with no initialValues -> back to export defaults
    setToast("Cleared ✓");
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
            {/* Save / restore controls */}
            <div
              style={{
                display: "flex",
                gap: 8,
                alignItems: "center",
                marginBottom: 16,
                padding: "8px 12px",
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: 8,
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

            <ConfiguratorPreviewDialog
              // Remount on config change OR after Load/Clear, so initialValues re-seeds.
              key={`${selectedId}-${seedNonce}`}
              configuratorJson={configurator}
              imagePrefix="https://imagedelivery.net/aYYmWUcv7lRhpLdU4ojPsA/"
              // null until "Load my data" is clicked — explicitly simulates entering a saved config.
              initialValues={seedValues ?? undefined}
              onVariableSetChange={vars => {
                console.log("impactedVariables:", vars);
              }}
              onLabelSetChange={labels => {
                console.log("labels:", labels);
              }}
              onGoToZone={zone => {
                console.log("goToZone:", zone);
              }}
              onNameSetChange={names => {
                console.log("names:", names);
                setLiveNames(names);
              }}
              layout="desktop"
            />
          </>
        )}
      </main>
    </div>
  );
}

export default App;
