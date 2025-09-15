import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"

test("renders solder mask over smtpads when enabled", () => {
  const circuit: any = [
    {
      type: "pcb_board",
      pcb_board_id: "board0",
      center: { x: 0, y: 0 },
      width: 5,
      height: 5,
    },
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pad_masked",
      shape: "rect",
      x: -1,
      y: 0,
      width: 1,
      height: 1,
      layer: "top",
      soldermask: true,
    },
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pad_exposed",
      shape: "rect",
      x: 1,
      y: 0,
      width: 1,
      height: 1,
      layer: "top",
    },
    {
      type: "pcb_trace",
      pcb_trace_id: "trace0",
      route: [
        { route_type: "wire", x: -2, y: -1, width: 0.2, layer: "top" },
        { route_type: "wire", x: 2, y: -1, width: 0.2, layer: "top" },
      ],
    },
  ]

  const svg = convertCircuitJsonToPcbSvg(circuit, {
    renderSolderMask: true,
    colorOverrides: {
      copper: { top: "#ff0000" },
      soldermask: { top: "#00ff00" },
    },
  })

  const maskCount = svg.match(/class="pcb-soldermask"/g)?.length ?? 0
  expect(maskCount).toBe(2)
  expect(svg).toContain('stroke="#ff0000"')
  expect(svg).toContain('class="pcb-soldermask" fill="#00ff00"')
  const copperPads = svg.match(/class="pcb-pad" fill="#ff0000"/g)?.length ?? 0
  expect(copperPads).toBeGreaterThan(0)
})
