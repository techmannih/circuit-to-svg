import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "../../lib/index.js"

const pcbSoup: AnyCircuitElement[] = [
  {
    type: "pcb_board",
    width: 12,
    height: 6,
    center: { x: 0, y: 0 },
    num_layers: 2,
    pcb_board_id: "pcb_board_0",
    thickness: 1.2,
    material: "fr1",
  },
  {
    type: "pcb_silkscreen_text",
    layer: "top",
    pcb_silkscreen_text_id: "pcb_silkscreen_text_knockout",
    font: "tscircuit2024",
    font_size: 1,
    pcb_component_id: "pcb_generic_component_0",
    anchor_position: { x: 0, y: 0 },
    anchor_alignment: "center",
    text: "KNOCKOUT",
    is_knockout: true,
  },
]

const Component = () => {
  const svg = convertCircuitJsonToPcbSvg(pcbSoup, {
    backgroundColor: "transparent",
  })

  return (
    <div
      style={{
        width: "800px",
        height: "600px",
        backgroundImage:
          "url(data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPSc0MCcgaGVpZ2h0PSc0MCc+PHJlY3Qgd2lkdGg9JzIwJyBoZWlnaHQ9JzIwJyBmaWxsPScjZmY3ZjdmJy8+PHJlY3QgeD0nMjAnIHdpZHRoPScyMCcgaGVpZ2h0PScyMCcgZmlsbD0nIzdmYmZmZicvPjxyZWN0IHk9JzIwJyB3aWR0aD0nMjAnIGhlaWdodD0nMjAnIGZpbGw9JyM3ZmJmZmYnLz48cmVjdCB4PScyMCcgeT0nMjAnIHdpZHRoPScyMCcgaGVpZ2h0PScyMCcgZmlsbD0nI2ZmN2Y3ZicvPjwvc3ZnPg==)",
        backgroundSize: "40px 40px",
      }}
    >
      {/* biome-ignore lint/security/noDangerouslySetInnerHtml: demo */}
      <div dangerouslySetInnerHTML={{ __html: svg }} />
    </div>
  )
}

export default <Component />
