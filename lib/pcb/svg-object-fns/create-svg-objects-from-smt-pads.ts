import type { PcbSmtPad } from "circuit-json"
import { applyToPoint } from "transformation-matrix"
import { layerNameToColor } from "../layer-name-to-color"
import type { PcbContext } from "../convert-circuit-json-to-pcb-svg"

export function createSvgObjectsFromSmtPad(
  pad: PcbSmtPad,
  ctx: PcbContext,
): any {
  const { transform, layer: layerFilter, colorMap, renderSolderMask } = ctx

  if (layerFilter && pad.layer !== layerFilter) return []

  if (pad.shape === "rect" || pad.shape === "rotated_rect") {
    const width = pad.width * Math.abs(transform.a)
    const height = pad.height * Math.abs(transform.d)
    const [x, y] = applyToPoint(transform, [pad.x, pad.y])

    const copperColor = layerNameToColor(pad.layer, colorMap)
    const solderMaskColor =
      colorMap.soldermask[pad.layer as keyof typeof colorMap.soldermask] ??
      copperColor

    const baseAttrs = {
      width: width.toString(),
      height: height.toString(),
      "data-layer": pad.layer,
    }

    if (pad.shape === "rotated_rect" && pad.ccw_rotation) {
      const attrs = {
        class: "pcb-pad",
        fill: renderSolderMask
          ? copperColor
          : pad.soldermask
            ? solderMaskColor
            : copperColor,
        x: (-width / 2).toString(),
        y: (-height / 2).toString(),
        transform: `translate(${x} ${y}) rotate(${-pad.ccw_rotation})`,
        ...baseAttrs,
      }

      const objects: any[] = [
        { name: "rect", type: "element", attributes: attrs },
      ]

      if (renderSolderMask && pad.soldermask) {
        objects.push({
          name: "rect",
          type: "element",
          attributes: {
            class: "pcb-soldermask",
            fill: solderMaskColor,
            x: (-width / 2).toString(),
            y: (-height / 2).toString(),
            transform: `translate(${x} ${y}) rotate(${-pad.ccw_rotation})`,
            ...baseAttrs,
          },
        })
      } else if (!renderSolderMask && pad.soldermask) {
        attrs.fill = solderMaskColor
      }

      return objects
    }

    const attrs = {
      class: "pcb-pad",
      fill: renderSolderMask
        ? copperColor
        : pad.soldermask
          ? solderMaskColor
          : copperColor,
      x: (x - width / 2).toString(),
      y: (y - height / 2).toString(),
      ...baseAttrs,
    }

    const objects: any[] = [
      { name: "rect", type: "element", attributes: attrs },
    ]

    if (renderSolderMask && pad.soldermask) {
      objects.push({
        name: "rect",
        type: "element",
        attributes: {
          class: "pcb-soldermask",
          fill: solderMaskColor,
          x: (x - width / 2).toString(),
          y: (y - height / 2).toString(),
          ...baseAttrs,
        },
      })
    } else if (!renderSolderMask && pad.soldermask) {
      attrs.fill = solderMaskColor
    }

    return objects
  }

  if (pad.shape === "pill") {
    const width = pad.width * Math.abs(transform.a)
    const height = pad.height * Math.abs(transform.d)
    const radius = pad.radius * Math.abs(transform.a)
    const [x, y] = applyToPoint(transform, [pad.x, pad.y])

    const copperColor = layerNameToColor(pad.layer, colorMap)
    const solderMaskColor =
      colorMap.soldermask[pad.layer as keyof typeof colorMap.soldermask] ??
      copperColor

    const baseAttrs = {
      width: width.toString(),
      height: height.toString(),
      rx: radius.toString(),
      ry: radius.toString(),
      "data-layer": pad.layer,
    }

    const attrs = {
      class: "pcb-pad",
      fill: renderSolderMask
        ? copperColor
        : pad.soldermask
          ? solderMaskColor
          : copperColor,
      x: (x - width / 2).toString(),
      y: (y - height / 2).toString(),
      ...baseAttrs,
    }

    const objects: any[] = [
      { name: "rect", type: "element", attributes: attrs },
    ]

    if (renderSolderMask && pad.soldermask) {
      objects.push({
        name: "rect",
        type: "element",
        attributes: {
          class: "pcb-soldermask",
          fill: solderMaskColor,
          x: (x - width / 2).toString(),
          y: (y - height / 2).toString(),
          ...baseAttrs,
        },
      })
    } else if (!renderSolderMask && pad.soldermask) {
      attrs.fill = solderMaskColor
    }

    return objects
  }
  if (pad.shape === "circle") {
    const radius = pad.radius * Math.abs(transform.a)
    const [x, y] = applyToPoint(transform, [pad.x, pad.y])

    const copperColor = layerNameToColor(pad.layer, colorMap)
    const solderMaskColor =
      colorMap.soldermask[pad.layer as keyof typeof colorMap.soldermask] ??
      copperColor

    const baseAttrs = {
      cx: x.toString(),
      cy: y.toString(),
      r: radius.toString(),
      "data-layer": pad.layer,
    }

    const attrs = {
      class: "pcb-pad",
      fill: renderSolderMask
        ? copperColor
        : pad.soldermask
          ? solderMaskColor
          : copperColor,
      ...baseAttrs,
    }

    const objects: any[] = [
      { name: "circle", type: "element", attributes: attrs },
    ]

    if (renderSolderMask && pad.soldermask) {
      objects.push({
        name: "circle",
        type: "element",
        attributes: {
          class: "pcb-soldermask",
          fill: solderMaskColor,
          ...baseAttrs,
        },
      })
    } else if (!renderSolderMask && pad.soldermask) {
      attrs.fill = solderMaskColor
    }

    return objects
  }

  if (pad.shape === "polygon") {
    const points = (pad.points ?? []).map((point) =>
      applyToPoint(transform, [point.x, point.y]),
    )

    const copperColor = layerNameToColor(pad.layer)
    const solderMaskColor =
      colorMap.soldermask[pad.layer as keyof typeof colorMap.soldermask] ??
      copperColor

    const baseAttrs = {
      points: points.map((p) => p.join(",")).join(" "),
      "data-layer": pad.layer,
    }

    const attrs = {
      class: "pcb-pad",
      fill: renderSolderMask
        ? copperColor
        : pad.soldermask
          ? solderMaskColor
          : copperColor,
      ...baseAttrs,
    }

    const objects: any[] = [
      { name: "polygon", type: "element", attributes: attrs },
    ]

    if (renderSolderMask && pad.soldermask) {
      objects.push({
        name: "polygon",
        type: "element",
        attributes: {
          class: "pcb-soldermask",
          fill: solderMaskColor,
          ...baseAttrs,
        },
      })
    } else if (!renderSolderMask && pad.soldermask) {
      attrs.fill = solderMaskColor
    }

    return objects
  }

  // TODO: Implement SMT pad circles/ovals etc.
  return []
}
