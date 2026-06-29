import { useEffect, useState } from "react";
import { ConfiguratorPreviewDialog } from "@oak-some/configurator-previewer";
import { CatalogTree } from "@oak-some/catalog-tree";

const CATALOG_API_URL =
  "https://backend.tecnibo.com/digitalfactory/oaksome-api/api/articles/tree";

const exportUrl = id =>
  `https://backend.tecnibo.com/digitalfactory/oaksome-api/api/configurator/${id}/export`;

function App() {
  const [selectedId, setSelectedId] = useState(null);
  const [configurator, setConfigurator] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | loading | error
  const [error, setError] = useState(null);

  useEffect(() => {
    if (selectedId == null) return;

    let cancelled = false;
    setStatus("loading");
    setError(null);
    setConfigurator(null);

    fetch(exportUrl(selectedId))
      .then(async res => {
        if (!res.ok) {
          throw new Error(`Export failed (${res.status})`);
        }
        return res.json();
      })
      .then(json => {
        if (cancelled) return;
        // Endpoint returns { message, data: { configurator, sources } }.
        // `data` is the ExportedConfigurator object the previewer expects.
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
          <ConfiguratorPreviewDialog
            key={selectedId}
            configuratorJson={configurator}
            imagePrefix="https://imagedelivery.net/aYYmWUcv7lRhpLdU4ojPsA/"
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
            }}
            layout="desktop"
          />
        )}
      </main>
    </div>
  );
}

export default App;
