import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { imageUrlsJsonTransformer } from './image-urls.storage';
import { MicrobeType } from './microbe-type.enum';

/** A single outer structure or surface feature entry stored in JSONB columns. */
export interface StructureEntry {
  name: string;
  normalized_name: string;
  presence: 'present' | 'absent' | 'variable' | 'unknown';
  clickable_candidate: boolean;
  visual_priority: number;
  description: string;
  notes: string | null;
  /** Filament or filament-sheath outer diameter in nanometres. Null when not applicable or unknown. */
  diameter_nm?: number | null;
  /** Typical structure length in µm. Null when not applicable or unknown. */
  length_um?: number | null;
  /**
   * Waveform geometry of the appendage.
   * - 'helical'    : true 3D helix (e.g. standard unsheathed bacterial flagellum)
   * - 'sinusoidal' : predominantly planar wave (e.g. sheathed Vibrio flagellum)
   */
  waveform_type?: 'helical' | 'sinusoidal' | null;
  /** Distance between successive wave crests in µm. Null when not applicable or unknown. */
  wavelength_um?: number | null;
  /** Peak-to-axis displacement in µm (half peak-to-peak). Null when not applicable or unknown. */
  amplitude_um?: number | null;
  /** Helical chirality of the filament. Null when not a helix or unknown. */
  handedness?: 'left' | 'right' | null;
  /**
   * Rotation direction during forward swimming, viewed from flagellum tip toward cell.
   * - 'ccw' : counter-clockwise (e.g. E. coli run)
   * - 'cw'  : clockwise
   */
  rotation_dir?: 'ccw' | 'cw' | null;
}

/**
 * One anatomical segment of a multi-part organism (e.g. bacteriophage T4).
 * Stored as a JSONB array in the body_segments column; ordered top-to-bottom.
 */
export interface BodySegment {
  /** Unique identifier matching a clickable region in default_clickable_regions. */
  id: string;
  /**
   * Three.js geometry type to render for this segment.
   * - thin_torus: ring-stage rim; `radius_um` = major radius, `height_um` = tube (minor) radius.
   * - sphere: sphere; `radius_um` = sphere radius; `height_um` unused.
   */
  geometry:
    | 'elongated_icosahedron'
    | 'cylinder'
    | 'disc'
    | 'thin_cylinders_6'
    | 'thin_torus'
    | 'sphere';
  /** Outer radius of the segment in µm (or sphere radius; or torus major radius). */
  radius_um: number;
  /** Height / length of the segment in µm (or torus tube minor radius). */
  height_um: number;
  /** Vertical offset from the body centre in µm (+up / −down → Three.js Y in viewers). */
  z_offset_um: number;
  /** Lateral offset in µm along Three.js +X (parasitic stages inside a host cell). */
  x_offset_um?: number | null;
}

@Entity({ name: 'microbes' })
export class Microbe {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  size: string;

  @Column({ name: 'natural_habitat' })
  natural_habitat: string;

  @Column('text')
  capabilities: string;

  @Column('text')
  description: string;

  @Column({
    type: 'text',
    default: '[]',
    transformer: imageUrlsJsonTransformer,
  })
  image_urls: string[];

  @Column({ type: 'enum', enum: MicrobeType, enumName: 'microbe_type_enum' })
  type: MicrobeType;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  // ── Morphology ──────────────────────────────────────────────────────────────

  @Column({ name: 'shape_family', type: 'text', nullable: true, default: null })
  shape_family: string | null;

  @Column({ name: 'cell_shape', type: 'text', nullable: true, default: null })
  cell_shape: string | null;

  @Column({ name: 'arrangement', type: 'text', nullable: true, default: null })
  arrangement: string | null;

  @Column({ name: 'gram_status', type: 'text', nullable: true, default: null })
  gram_status: string | null;

  @Column({ name: 'motility', type: 'text', nullable: true, default: null })
  motility: string | null;

  @Column({ name: 'motility_mechanism', type: 'jsonb', default: '[]' })
  motility_mechanism: string[];

  @Column({ name: 'curvature', type: 'text', nullable: true, default: null })
  curvature: string | null;

  @Column({ name: 'length_um_min', type: 'real', nullable: true, default: null })
  length_um_min: number | null;

  @Column({ name: 'length_um_max', type: 'real', nullable: true, default: null })
  length_um_max: number | null;

  @Column({ name: 'width_um_min', type: 'real', nullable: true, default: null })
  width_um_min: number | null;

  @Column({ name: 'width_um_max', type: 'real', nullable: true, default: null })
  width_um_max: number | null;

  // ── Outer structures & surface features (JSONB arrays) ───────────────────

  @Column({ name: 'outer_structures', type: 'jsonb', nullable: true, default: null })
  outer_structures: StructureEntry[] | null;

  @Column({ name: 'surface_features', type: 'jsonb', nullable: true, default: null })
  surface_features: StructureEntry[] | null;

  // ── Procedural model hints ───────────────────────────────────────────────

  @Column({ name: 'base_body_template', type: 'text', nullable: true, default: null })
  base_body_template: string | null;

  @Column({ name: 'symmetry', type: 'text', nullable: true, default: null })
  symmetry: string | null;

  @Column({ name: 'body_complexity', type: 'text', nullable: true, default: null })
  body_complexity: string | null;

  @Column({ name: 'segmentation_strategy', type: 'text', nullable: true, default: null })
  segmentation_strategy: string | null;

  @Column({ name: 'default_clickable_regions', type: 'jsonb', nullable: true, default: null })
  default_clickable_regions: string[] | null;

  @Column({ name: 'modeling_notes', type: 'text', nullable: true, default: null })
  modeling_notes: string | null;

  // ── Knowledge quality ────────────────────────────────────────────────────

  @Column({ name: 'knowledge_confidence', type: 'text', nullable: true, default: null })
  knowledge_confidence: string | null;

  @Column({ name: 'missing_critical_data', type: 'jsonb', nullable: true, default: null })
  missing_critical_data: string[] | null;

  @Column({ name: 'source_reliability_notes', type: 'text', nullable: true, default: null })
  source_reliability_notes: string | null;

  @Column({ name: 'notes', type: 'text', nullable: true, default: null })
  notes: string | null;

  @Column({ name: 'body_segments', type: 'jsonb', nullable: true, default: null })
  body_segments: BodySegment[] | null;
}
