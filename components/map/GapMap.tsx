"use client";

import "leaflet/dist/leaflet.css";
import { useMemo } from "react";
import { GeoJSON, MapContainer } from "react-leaflet";
import type { Layer, PathOptions } from "leaflet";
import { SEQ } from "@/lib/charts/palette";

export type ChoroplethProps = {
  geometry: GeoJSON.FeatureCollection;
  /** value by feature id (properties.puma) */
  values: Record<string, number>;
  selected?: string | null;
  onSelect?: (id: string) => void;
  tooltip: (id: string) => string;
  height?: number;
  breaks: number[];
};

export function colorFor(v: number, breaks: number[]) {
  let i = 0;
  while (i < breaks.length && v > breaks[i]) i++;
  return SEQ[Math.min(SEQ.length - 1, i + 1)];
}

export default function Choropleth({ geometry, values, selected, onSelect, tooltip, height = 520, breaks }: ChoroplethProps) {
  // Re-key the GeoJSON layer when data changes so Leaflet restyles.
  const key = useMemo(() => JSON.stringify([Object.values(values).slice(0, 5), breaks, selected]), [values, breaks, selected]);

  const style = (f?: GeoJSON.Feature): PathOptions => {
    const id = String(f?.properties?.puma ?? "");
    const isSel = id === selected;
    return {
      fillColor: values[id] === undefined ? "#eee" : colorFor(values[id], breaks),
      fillOpacity: 0.85,
      color: isSel ? "#e9a23b" : "#ffffff",
      weight: isSel ? 3.5 : 1,
    };
  };

  const onEach = (f: GeoJSON.Feature, layer: Layer) => {
    const id = String(f.properties?.puma ?? "");
    layer.bindTooltip(tooltip(id), { sticky: true, direction: "top" });
    layer.on({
      click: () => onSelect?.(id),
      mouseover: (e) => e.target.setStyle({ weight: 2.5, color: "#1d2a33" }),
      mouseout: (e) => e.target.setStyle(style(f)),
      keypress: () => onSelect?.(id),
    });
  };

  return (
    <div style={{ height }} className="overflow-hidden rounded-2xl border border-line">
      <MapContainer center={[40.705, -73.94]} zoom={height < 400 ? 9.5 : 10.25} minZoom={9} maxZoom={14} scrollWheelZoom={false} style={{ height: "100%", width: "100%", background: "#f3efe7" }} attributionControl={false} zoomSnap={0.25}>
        <GeoJSON key={key} data={geometry} style={style} onEachFeature={onEach} />
      </MapContainer>
    </div>
  );
}
