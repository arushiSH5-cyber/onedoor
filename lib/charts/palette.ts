/** Categorical order validated with the dataviz palette checker (light surface): all checks pass. */
export const SERIES = ["#0b84a5", "#c97a12", "#8a5a9e", "#b5452f"] as const;

/** Sequential single-hue teal ramp, light → dark, for magnitude (maps). */
export const SEQ = ["#e6f2f3", "#bfdfe3", "#8fc5cd", "#5aa6b3", "#2f8597", "#146477", "#0b3a46"] as const;

export const INK = { primary: "#1d2a33", muted: "#5a6872", grid: "#e6ded1" };

export const PATHWAY_COLOR: Record<string, string> = {
  EAP: SERIES[0],
  EEAP: SERIES[1],
  NEEDS_INFO: SERIES[2],
  NOT_ELIGIBLE: SERIES[3],
  NOT_CUSTOMER: "#9aa5ab",
};
