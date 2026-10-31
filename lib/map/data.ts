import model from "@/data/gap-model.json";
import geometry from "@/data/nyc-pumas.json";

export type Area = (typeof model.areas)[number];
export const gapModel = model;
export const pumaGeometry = geometry as unknown as GeoJSON.FeatureCollection;
