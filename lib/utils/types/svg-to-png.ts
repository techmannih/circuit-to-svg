export interface ResvgRenderOptions {
  background?: string
  fitTo?: { mode: "width" | "height"; value: number }
  font?: {
    fontFiles?: string[]
  }
}
