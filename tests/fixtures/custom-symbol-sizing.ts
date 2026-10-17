import { expect } from "bun:test"
import type { CircuitJson } from "circuit-json"

export { customSymbolSizingCode } from "./custom-symbol-sizing-code"

export const expectCustomSymbolSizing = (circuitJson: CircuitJson) => {
  for (const [name, width, height] of [
    ["Legacy", 2 / 1.1, 1.2],
    ["WidthOnly", 2 / 1.1, 2 / 1.1],
    ["Contained", 1.2, 1.2],
    ["LocalViewbox", 2, 2],
    ["Stretched", 2, 1.2],
  ] as const) {
    const source = circuitJson
      .filter((element) => element.type === "source_component")
      .find((component) => component.name === name)!
    const component = circuitJson
      .filter((element) => element.type === "schematic_component")
      .find(
        (component) =>
          component.source_component_id === source.source_component_id,
      )!
    const path = circuitJson
      .filter((element) => element.type === "schematic_path")
      .find(
        (path) =>
          path.schematic_component_id === component.schematic_component_id,
      )!
    const minX = Math.min(...path.points.map((point) => point.x))
    const maxX = Math.max(...path.points.map((point) => point.x))
    const minY = Math.min(...path.points.map((point) => point.y))
    const maxY = Math.max(...path.points.map((point) => point.y))
    expect(maxX - minX).toBeCloseTo(width, 6)
    expect(maxY - minY).toBeCloseTo(height, 6)
    if (name === "LocalViewbox") {
      expect((minX + maxX) / 2).toBeCloseTo(4, 6)
      expect((minY + maxY) / 2).toBeCloseTo(2, 6)
      const port = circuitJson
        .filter((element) => element.type === "schematic_port")
        .find(
          (port) =>
            port.schematic_component_id === component.schematic_component_id,
        )!
      expect(port.center.x).toBeCloseTo(5, 6)
      expect(port.center.y).toBeCloseTo(2, 6)
    }
  }
  expect(
    circuitJson.filter((element) => element.type.endsWith("_error")),
  ).toEqual([])
}
