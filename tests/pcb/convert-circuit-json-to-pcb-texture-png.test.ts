import { describe, expect, test } from "bun:test"
import {
  convertCircuitJsonToPcbTexturePng,
  type ConvertCircuitJsonToPcbTexturePngOptions,
  type ResvgModuleLike,
} from "lib"

const basicCircuit = [
  {
    type: "pcb_board",
    pcb_board_id: "board0",
    center: { x: 0, y: 0 },
    width: 10,
    height: 20,
  },
  {
    type: "pcb_trace",
    pcb_trace_id: "trace0",
    width: 0.3,
    route: [
      { x: -4, y: -8 },
      { x: 4, y: 8 },
    ],
  },
] as any

describe("convertCircuitJsonToPcbTexturePng", () => {
  test("returns png bytes, metadata, and initializes wasm when provided", async () => {
    const initCalls: unknown[] = []
    const instances: { svg: string; options?: unknown }[] = []

    class MockResvg {
      constructor(svg: string, options?: unknown) {
        instances.push({ svg, options })
      }

      render() {
        return {
          width: 256,
          height: 512,
          asPng: () => new Uint8Array([0, 1, 2, 3]),
        }
      }
    }

    const mockModule: ResvgModuleLike = {
      async initWasm(module) {
        initCalls.push(module)
      },
      Resvg: MockResvg as unknown as ResvgModuleLike["Resvg"],
    }

    const result = await convertCircuitJsonToPcbTexturePng(basicCircuit, {
      resvgModule: mockModule,
      wasmModule: async () => new Uint8Array([5, 6, 7]),
      textureWidth: 512,
      output: "both",
      backgroundColor: "#123456",
    } satisfies ConvertCircuitJsonToPcbTexturePngOptions)

    expect(initCalls).toHaveLength(1)
    expect(initCalls[0]).toBeInstanceOf(Uint8Array)
    expect(instances).toHaveLength(1)
    expect(instances[0].svg).toContain("<svg")
    expect(instances[0].options).toMatchObject({
      fitTo: { mode: "width", value: 512 },
      background: "#123456",
    })
    expect(Array.from(result.png)).toEqual([0, 1, 2, 3])
    expect(result.width).toBe(256)
    expect(result.height).toBe(512)
    expect(result.dataUrl).toBe("data:image/png;base64,AAECAw==")
  })

  test("accepts asynchronous resvg module loader", async () => {
    const result = await convertCircuitJsonToPcbTexturePng(basicCircuit, {
      resvgModule: async () => ({
        Resvg: class {
          constructor() {
            return {
              render: () => ({
                width: 64,
                height: 64,
                asPng: () => new Uint8Array([9, 8, 7]),
              }),
            }
          }
        } as unknown as ResvgModuleLike["Resvg"],
      }),
      output: "data-url",
      textureWidth: 64,
    })

    expect(result.dataUrl).toBe("data:image/png;base64,CQgH")
    expect(Array.from(result.png)).toEqual([9, 8, 7])
    expect(result.width).toBe(64)
    expect(result.height).toBe(64)
  })
})
