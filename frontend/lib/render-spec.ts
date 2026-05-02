/**
 * Types mirroring the backend render-spec.mapper.ts output.
 */

export interface AppendageHint {
  attachment: "peritrichous" | "polar" | "surface" | "surface_sphere"
  count: number
  diameter_nm: number | null
  length_um: number | null
  waveform_type: "helical" | "sinusoidal" | null
  wavelength_um: number | null
  amplitude_um: number | null
  handedness: "left" | "right" | null
  rotation_dir: "ccw" | "cw" | null
}

export interface BacteriumPart {
  id: string
  label: string
  presence: "present" | "variable" | "absent" | "unknown"
  clickable: boolean
  description: string
  notes: string | null
  render_hint: AppendageHint | null
}

/** One anatomical segment of a multi-part organism (phage tail, parasite in host cell, …). */
export interface BodySegment {
  id: string
  geometry:
    | "elongated_icosahedron"
    | "cylinder"
    | "disc"
    | "thin_cylinders_6"
    | "thin_torus"
    | "sphere"
  radius_um: number
  height_um: number
  z_offset_um: number
  x_offset_um?: number | null
}

export interface BacteriumBody {
  template:
    | "rod"
    | "coccus"
    | "curved_rod"
    | "enveloped_sphere"
    | "icosahedral"
    | "complex_phage"
    | "plasmodium_blood_stage"
  length_um: number
  width_um: number
  gram_status: string | null
  curvature: string | null
  /** Ordered segments for complex_phage and plasmodium_blood_stage; null otherwise. */
  segments: BodySegment[] | null
}

export interface BacteriumRenderSpec {
  microbe_id: string
  name: string
  renderable: boolean
  reason: string | null
  body: BacteriumBody | null
  parts: BacteriumPart[]
}
