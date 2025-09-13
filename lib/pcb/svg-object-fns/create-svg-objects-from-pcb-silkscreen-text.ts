import type { PcbSilkscreenText } from "circuit-json"
import type { INode as SvgObject } from "svgson"
import {
  applyToPoint,
  compose,
  rotate,
  translate,
  scale,
  toString as matrixToString,
} from "transformation-matrix"
import type { PcbContext } from "../convert-circuit-json-to-pcb-svg"
export function createSvgObjectsFromPcbSilkscreenText(
  pcbSilkscreenText: PcbSilkscreenText,
  ctx: PcbContext,
): SvgObject[] {
  const { transform, layer: layerFilter, colorMap } = ctx
  const {
    anchor_position,
    text,
    font_size = 1,
    layer = "top",
    ccw_rotation = 0,
    anchor_alignment = "center",
    is_knockout = false,
    knockout_padding = {
      left: 0.2,
      right: 0.2,
      top: 0.2,
      bottom: 0.2,
    },
  } = pcbSilkscreenText

  if (layerFilter && layer !== layerFilter) return []

  if (
    !anchor_position ||
    typeof anchor_position.x !== "number" ||
    typeof anchor_position.y !== "number"
  ) {
    console.error("Invalid anchor_position:", anchor_position)
    return []
  }

  const [transformedX, transformedY] = applyToPoint(transform, [
    anchor_position.x,
    anchor_position.y,
  ])

  const transformedFontSize = font_size * Math.abs(transform.a)

  // Set text-anchor and dominant-baseline based on alignment
  let textAnchor: string = "middle"
  let dominantBaseline: string = "central"
  let dx = 0
  let dy = 0

  switch (anchor_alignment) {
    case "top_left":
      textAnchor = "start"
      dominantBaseline = "text-before-edge"
      break
    case "top_center":
      textAnchor = "middle"
      dominantBaseline = "text-before-edge"
      break
    case "top_right":
      textAnchor = "end"
      dominantBaseline = "text-before-edge"
      break
    case "center_left":
      textAnchor = "start"
      dominantBaseline = "central"
      break
    case "center_right":
      textAnchor = "end"
      dominantBaseline = "central"
      break
    case "bottom_left":
      textAnchor = "start"
      dominantBaseline = "text-after-edge"
      break
    case "bottom_center":
      textAnchor = "middle"
      dominantBaseline = "text-after-edge"
      break
    case "bottom_right":
      textAnchor = "end"
      dominantBaseline = "text-after-edge"
      break
    case "center":
    default:
      textAnchor = "middle"
      dominantBaseline = "central"
      break
  }

  const textTransform = compose(
    translate(transformedX, transformedY),
    rotate((ccw_rotation * Math.PI) / 180),
    ...(layer === "bottom" ? [scale(-1, 1)] : []),
  )

  const silkscreenColor =
    layer === "bottom" ? colorMap.silkscreen.bottom : colorMap.silkscreen.top

  const lines = text.split("\n")

  const children: SvgObject[] =
    lines.length === 1
      ? [
          {
            type: "text",
            value: text,
            name: "",
            attributes: {},
            children: [],
          },
        ]
      : lines.map((line, idx) => ({
          type: "element",
          name: "tspan",
          value: "",
          attributes: {
            x: "0",
            ...(idx > 0 ? { dy: transformedFontSize.toString() } : {}),
          },
          children: [
            {
              type: "text",
              value: line,
              name: "",
              attributes: {},
              children: [],
            },
          ],
        }))

  const textAttributes = {
    x: "0",
    y: "0",
    dx: dx.toString(),
    dy: dy.toString(),
    fill: silkscreenColor,
    "font-family": "Arial, sans-serif",
    "font-size": transformedFontSize.toString(),
    "text-anchor": textAnchor,
    "dominant-baseline": dominantBaseline,
    transform: matrixToString(textTransform),
    class: `pcb-silkscreen-text pcb-silkscreen-${layer}`,
    "data-pcb-silkscreen-text-id": pcbSilkscreenText.pcb_component_id,
    stroke: "none",
  }

  const textObject: SvgObject = {
    name: "text",
    type: "element",
    attributes: textAttributes,
    children,
    value: "",
  }

  if (!is_knockout) return [textObject]

  const paddingLeft = knockout_padding.left * Math.abs(transform.a)
  const paddingRight = knockout_padding.right * Math.abs(transform.a)
  const paddingTop = knockout_padding.top * Math.abs(transform.a)
  const paddingBottom = knockout_padding.bottom * Math.abs(transform.a)

  const maxLineLength = Math.max(...lines.map((l) => l.length), 0)
  const textWidth = maxLineLength * transformedFontSize
  const textHeight = lines.length * transformedFontSize

  const rectWidth = textWidth + paddingLeft + paddingRight
  const rectHeight = textHeight + paddingTop + paddingBottom

  let rectX = -paddingLeft
  let rectY = -paddingTop

  switch (anchor_alignment) {
    case "top_center":
      rectX = -textWidth / 2 - paddingLeft
      break
    case "top_right":
      rectX = -textWidth - paddingLeft
      break
    case "center_left":
      rectY = -textHeight / 2 - paddingTop
      break
    case "center":
      rectX = -textWidth / 2 - paddingLeft
      rectY = -textHeight / 2 - paddingTop
      break
    case "center_right":
      rectX = -textWidth - paddingLeft
      rectY = -textHeight / 2 - paddingTop
      break
    case "bottom_left":
      rectY = -textHeight - paddingTop
      break
    case "bottom_center":
      rectX = -textWidth / 2 - paddingLeft
      rectY = -textHeight - paddingTop
      break
    case "bottom_right":
      rectX = -textWidth - paddingLeft
      rectY = -textHeight - paddingTop
      break
  }

  const maskId = `pcb-silkscreen-text-mask-${pcbSilkscreenText.pcb_silkscreen_text_id}`

  const maskRect: SvgObject = {
    name: "rect",
    type: "element",
    attributes: {
      x: rectX.toString(),
      y: rectY.toString(),
      width: rectWidth.toString(),
      height: rectHeight.toString(),
      fill: "white",
      transform: matrixToString(textTransform),
    },
    children: [],
    value: "",
  }

  const maskText: SvgObject = {
    name: "text",
    type: "element",
    attributes: {
      ...textAttributes,
      fill: "black",
    },
    children,
    value: "",
  }

  const maskCorners = [
    [rectX, rectY],
    [rectX + rectWidth, rectY],
    [rectX, rectY + rectHeight],
    [rectX + rectWidth, rectY + rectHeight],
  ].map(([x, y]) => applyToPoint(textTransform, [x, y]))

  const maskXs = maskCorners.map(([x]) => x)
  const maskYs = maskCorners.map(([, y]) => y)
  const maskX = Math.min(...maskXs)
  const maskY = Math.min(...maskYs)
  const maskWidth = Math.max(...maskXs) - maskX
  const maskHeight = Math.max(...maskYs) - maskY

  const maskObject: SvgObject = {
    name: "mask",
    type: "element",
    attributes: {
      id: maskId,
      maskUnits: "userSpaceOnUse",
      x: maskX.toString(),
      y: maskY.toString(),
      width: maskWidth.toString(),
      height: maskHeight.toString(),
    },
    children: [maskRect, maskText],
    value: "",
  }

  const rectObject: SvgObject = {
    name: "rect",
    type: "element",
    attributes: {
      x: rectX.toString(),
      y: rectY.toString(),
      width: rectWidth.toString(),
      height: rectHeight.toString(),
      fill: silkscreenColor,
      transform: matrixToString(textTransform),
      mask: `url(#${maskId})`,
      class: `pcb-silkscreen-text-knockout-area pcb-silkscreen-${layer}`,
      "data-pcb-silkscreen-text-id": pcbSilkscreenText.pcb_component_id,
      stroke: "none",
    },
    children: [],
    value: "",
  }

  return [maskObject, rectObject]
}
