import { expect, test } from "bun:test"
import {
  PCB_BOARD_TEXTURE_PATTERN_ID,
  convertCircuitJsonToPcbSvg,
  pcbBoardTexturePngDataUrl,
} from "lib"

test("pcb board texture is generated and applied", () => {
  expect(pcbBoardTexturePngDataUrl).toBeTruthy()

  const svg = convertCircuitJsonToPcbSvg([
    {
      type: "pcb_board",
      pcb_board_id: "board0",
      center: { x: 0, y: 0 },
      width: 10,
      height: 5,
    } as any,
  ])

  expect(svg).toContain(`url(#${PCB_BOARD_TEXTURE_PATTERN_ID})`)
  expect(svg).toContain(`<pattern id=\"${PCB_BOARD_TEXTURE_PATTERN_ID}\"`)
})
