import { BodySegment, Microbe, StructureEntry } from './microbe.entity';

// ── V1 allowed values ──────────────────────────────────────────────────────

/** Body templates supported for rendering. */
const SUPPORTED_TEMPLATES = [
  'rod',
  'coccus',
  'curved_rod',
  'enveloped_sphere',
  'icosahedral',
  'complex_phage',
  /** Plasmodium-style ring-stage parasite nested in a translucent erythrocyte shell */
  'plasmodium_blood_stage',
] as const;

/** Only these normalized_names are turned into renderable parts. */
const SUPPORTED_PART_NAMES = [
  // bacteria
  'outer_membrane',
  'capsule',
  'flagella',
  'flagellum',
  'fimbriae',
  'pili',
  // virus — envelope / matrix
  'envelope',
  'matrix',
  // virus — surface proteins
  'spike_protein',
  'hemagglutinin',
  'neuraminidase',
  'capsid',
  // phage — segment IDs (clickable but geometry driven by body_segments)
  'head',
  'collar',
  'tail_sheath',
  'baseplate',
  'tail_fibers',
  // parasite — blood-stage schematic (segments + outer_structures)
  'erythrocyte_shell',
  'parasite_cytoplasm_ring',
  'digestive_vacuole',
  'nucleus',
] as const;

type SupportedPartName = (typeof SUPPORTED_PART_NAMES)[number];

/** Render hints for appendage/surface-protein parts, keyed by normalized_name. */
const APPENDAGE_HINTS: Record<
  string,
  { attachment: 'peritrichous' | 'polar' | 'surface' | 'surface_sphere'; count: number }
> = {
  // bacteria
  flagella: { attachment: 'peritrichous', count: 8 },
  flagellum: { attachment: 'polar', count: 1 },
  fimbriae: { attachment: 'surface', count: 16 },
  pili: { attachment: 'surface', count: 6 },
  // virus surface proteins — distributed on sphere via Fibonacci algorithm
  spike_protein:  { attachment: 'surface_sphere', count: 25 },
  hemagglutinin:  { attachment: 'surface_sphere', count: 20 },
  neuraminidase:  { attachment: 'surface_sphere', count: 5 },
};

// ── Interfaces ─────────────────────────────────────────────────────────────

export interface AppendageHint {
  attachment: 'peritrichous' | 'polar' | 'surface' | 'surface_sphere';
  count: number;
  /** Filament outer diameter in nanometres, sourced directly from the DB entry. */
  diameter_nm: number | null;
  /** Typical structure length in µm, sourced directly from the DB entry. */
  length_um: number | null;
  /** Waveform shape: 'helical' = true 3D helix; 'sinusoidal' = planar wave. */
  waveform_type: 'helical' | 'sinusoidal' | null;
  /** Distance between successive wave crests in µm. */
  wavelength_um: number | null;
  /** Peak-to-axis wave displacement in µm. */
  amplitude_um: number | null;
  /** Helical chirality of the filament. */
  handedness: 'left' | 'right' | null;
  /** Rotation direction during forward swimming, viewed from the filament tip. */
  rotation_dir: 'ccw' | 'cw' | null;
}

export interface BacteriumPart {
  id: string;
  label: string;
  presence: 'present' | 'variable' | 'absent' | 'unknown';
  clickable: boolean;
  description: string;
  notes: string | null;
  /** Present for appendage parts (flagella, fimbriae, pili); null for shells. */
  render_hint: AppendageHint | null;
}

export interface BacteriumBody {
  template:
    | 'rod'
    | 'coccus'
    | 'curved_rod'
    | 'enveloped_sphere'
    | 'icosahedral'
    | 'complex_phage'
    | 'plasmodium_blood_stage';
  length_um: number;
  width_um: number;
  /** Gram stain status; drives color selection in the frontend. */
  gram_status: string | null;
  /** Curvature descriptor from the entity; drives geometry bend for curved_rod. */
  curvature: string | null;
  /** Ordered anatomical segments for complex_phage / plasmodium_blood_stage; null otherwise. */
  segments: BodySegment[] | null;
}

export interface BacteriumRenderSpec {
  microbe_id: string;
  name: string;
  renderable: boolean;
  reason: string | null;
  body: BacteriumBody | null;
  parts: BacteriumPart[];
}

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Returns the midpoint of a min/max pair, or the fallback value when either
 * bound is null.
 * @param min - Minimum measurement value
 * @param max - Maximum measurement value
 * @param fallback - Default when data is missing
 * @returns Midpoint or fallback
 */
function midpoint(
  min: number | null,
  max: number | null,
  fallback: number,
): number {
  if (min !== null && max !== null) {
    return (min + max) / 2;
  }
  return fallback;
}

/**
 * Checks whether a normalized_name is supported for v1 rendering.
 * @param name - normalized_name from the outer_structures entry
 */
function isSupportedPartName(name: string): name is SupportedPartName {
  return (SUPPORTED_PART_NAMES as readonly string[]).includes(name);
}

// ── Mapper ─────────────────────────────────────────────────────────────────

/**
 * Converts a Microbe entity into a minimal render spec for the v1 procedural
 * 3D viewer. Only rod bacteria with sufficient data are renderable.
 *
 * Returns renderable: false (never throws) when the bacterium cannot be
 * rendered in v1.
 *
 * @param microbe - Fully loaded Microbe entity
 * @returns BacteriumRenderSpec ready to serialize as JSON
 */
export function toRenderSpec(microbe: Microbe): BacteriumRenderSpec {
  const base: Pick<BacteriumRenderSpec, 'microbe_id' | 'name'> = {
    microbe_id: microbe.id,
    name: microbe.name,
  };

  // ── Renderability check ──────────────────────────────────────────────────

  const template = microbe.base_body_template;

  if (!template || !(SUPPORTED_TEMPLATES as readonly string[]).includes(template)) {
    return Object.assign({}, base, {
      renderable: false,
      reason: template
        ? `unsupported body template: ${template}`
        : 'base_body_template is not set',
      body: null,
      parts: [],
    });
  }

  const segmentedTemplate =
    template === 'complex_phage' || template === 'plasmodium_blood_stage';
  const segmentList = microbe.body_segments ?? null;

  if (template === 'plasmodium_blood_stage') {
    if (!segmentList || segmentList.length === 0) {
      return Object.assign({}, base, {
        renderable: false,
        reason: 'plasmodium_blood_stage requires non-empty body_segments',
        body: null,
        parts: [],
      });
    }
  }

  // ── Body ─────────────────────────────────────────────────────────────────

  // Coccus (sphere) and spherical viruses store diameter in width_um; length fields may be null.
  const isSpherical =
    template === 'coccus' ||
    template === 'enveloped_sphere' ||
    template === 'icosahedral' ||
    template === 'plasmodium_blood_stage';

  const body: BacteriumBody = {
    template: template as BacteriumBody['template'],
    length_um: isSpherical
      ? midpoint(microbe.width_um_min, microbe.width_um_max, 1.0)
      : midpoint(microbe.length_um_min, microbe.length_um_max, 1.5),
    width_um: midpoint(microbe.width_um_min, microbe.width_um_max, 0.5),
    gram_status: microbe.gram_status,
    curvature: microbe.curvature,
    segments: segmentList,
  };

  // ── Parts ─────────────────────────────────────────────────────────────────

  const clickableSet = new Set<string>(microbe.default_clickable_regions ?? []);

  // Segmented assemblies: generic "cell body" is replaced by clickable segment parts.
  const bodyPart: BacteriumPart | null = segmentedTemplate
    ? null
    : {
        id: 'body',
        label: 'Cell body',
        presence: 'present',
        clickable: true,
        description: microbe.description ?? 'The main cell body.',
        notes: null,
        render_hint: null,
      };

  const structureParts: BacteriumPart[] = (microbe.outer_structures ?? [])
    .filter((entry: StructureEntry) => isSupportedPartName(entry.normalized_name))
    .filter((entry: StructureEntry) => entry.presence !== 'absent')
    .map((entry: StructureEntry): BacteriumPart => {
      const baseHint = APPENDAGE_HINTS[entry.normalized_name] ?? null;
      const render_hint: AppendageHint | null = baseHint
        ? Object.assign({}, baseHint, {
            diameter_nm: entry.diameter_nm ?? null,
            length_um: entry.length_um ?? null,
            waveform_type: entry.waveform_type ?? null,
            wavelength_um: entry.wavelength_um ?? null,
            amplitude_um: entry.amplitude_um ?? null,
            handedness: entry.handedness ?? null,
            rotation_dir: entry.rotation_dir ?? null,
          })
        : null;
      return {
        id: entry.normalized_name,
        label: entry.name,
        presence: entry.presence,
        clickable: clickableSet.has(entry.normalized_name),
        description: entry.description,
        notes: entry.notes,
        render_hint,
      };
    });

  const allParts: BacteriumPart[] = bodyPart
    ? [bodyPart].concat(structureParts)
    : structureParts;

  return Object.assign({}, base, {
    renderable: true,
    reason: null,
    body,
    parts: allParts,
  });
}
