import { expect, test } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"
import { getCopperLayerPriority } from "lib/pcb/copper-layer-order"

const circuit: any[] = [
  {
    type: "pcb_board",
    pcb_board_id: "board",
    center: { x: 0, y: 0 },
    width: 20,
    height: 20,
  },
  {
    type: "pcb_trace",
    pcb_trace_id: "mixed",
    source_trace_id: "mixed",
    route: [
      { route_type: "wire", x: -8, y: -4, width: 0.4, layer: "bottom" },
      { route_type: "wire", x: -2, y: -4, width: 0.4, layer: "bottom" },
      { route_type: "wire", x: -2, y: -4, width: 0.4, layer: "inner1" },
      { route_type: "wire", x: 2, y: -4, width: 0.4, layer: "inner1" },
      { route_type: "wire", x: 2, y: -4, width: 0.4, layer: "top" },
      { route_type: "wire", x: 8, y: -4, width: 0.4, layer: "top" },
    ],
  },
  {
    type: "pcb_trace",
    pcb_trace_id: "inner",
    source_trace_id: "inner",
    route: [
      { route_type: "wire", x: -8, y: 0, width: 0.4, layer: "inner2" },
      { route_type: "wire", x: 8, y: 0, width: 0.4, layer: "inner2" },
    ],
  },
  {
    type: "pcb_trace",
    pcb_trace_id: "bottom",
    source_trace_id: "bottom",
    route: [
      { route_type: "wire", x: -8, y: 4, width: 0.4, layer: "bottom" },
      { route_type: "wire", x: 8, y: 4, width: 0.4, layer: "bottom" },
    ],
  },
]

test("traces are rendered in copper stack order", () => {
  const svg = convertCircuitJsonToPcbSvg(circuit)
  const layers = Array.from(
    svg.matchAll(/class=\"pcb-trace\"[^>]*data-layer=\"([^\"]+)\"/g),
    (match) => match[1],
  )

  const priorities = layers.map((layer) => getCopperLayerPriority(layer))
  const sorted = [...priorities].sort((a, b) => a - b)

  expect(priorities).toEqual(sorted)
})
