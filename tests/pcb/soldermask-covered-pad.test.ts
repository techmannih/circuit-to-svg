import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"

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
    pcb_smtpad_id: "pad0",
    layer: "top",
    shape: "rect",
    width: 1,
    height: 1,
    x: 0,
    y: 0,
    solder_mask: true,
  },
]

test("smt pads can be covered by soldermask", () => {
  const svg = convertCircuitJsonToPcbSvg(circuit, {
    renderSolderMask: true,
    colorOverrides: {
      copper: { top: "#ff0000" },
      soldermask: { top: "#00ff00" },
    },
  })
  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
