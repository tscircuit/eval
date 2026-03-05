const isKicadFootprint = (footprint: unknown) =>
  typeof footprint === "string" &&
  (footprint.includes(".kicad_mod") || footprint.startsWith("kicad:"))

const hasExplicitFabVisibleOverride = (component: any) =>
  component?._parsedProps?.pcbSx?.["& fabricationnotetext"]?.visibility ===
    "visible" ||
  component?.props?.pcbSx?.["& fabricationnotetext"]?.visibility === "visible"

const placeholderFabHideDefaults = {
  "& footprint fabricationnotetext[text^='${REF']": {
    visibility: "hidden" as const,
  },
  "& footprint fabricationnotetext[text='REFERENCE']": {
    visibility: "hidden" as const,
  },
  "& footprint fabricationnotetext[text='%R']": {
    visibility: "hidden" as const,
  },
  "& footprint fabricationnotetext[text='REF**']": {
    visibility: "hidden" as const,
  },
}

const applyToComponentTree = (component: any) => {
  if (!component || typeof component !== "object") return

  const footprint =
    component?.props?.footprint ?? component?._parsedProps?.footprint
  if (
    isKicadFootprint(footprint) &&
    !hasExplicitFabVisibleOverride(component)
  ) {
    const existingPcbSx =
      component?._parsedProps?.pcbSx ?? component?.props?.pcbSx ?? {}
    const mergedPcbSx = {
      ...placeholderFabHideDefaults,
      ...existingPcbSx,
    }
    component._parsedProps = { ...component._parsedProps, pcbSx: mergedPcbSx }
    component.props = { ...component.props, pcbSx: mergedPcbSx }
  }

  if (!Array.isArray(component.children)) return
  for (const child of component.children) {
    applyToComponentTree(child)
  }
}

export const applyKicadFootprintDefaultFabVisibility = (rootCircuit: any) => {
  applyToComponentTree(rootCircuit)
}
