import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Microbe, StructureEntry } from './microbes/microbe.entity';

/**
 * Enriches the 4 bacteria records in the database with normalized morphology,
 * outer structure, surface feature, and procedural model hint data.
 *
 * Run once via: npm run enrich:bacteria
 * Re-running is safe — existing enrichment fields are overwritten.
 */

interface BacteriaEnrichment {
  name: string;
  scientific_name: string;
  shape_family: string | null;
  cell_shape: string | null;
  arrangement: string | null;
  gram_status: string | null;
  motility: string | null;
  motility_mechanism: string[];
  curvature: string | null;
  length_um_min: number | null;
  length_um_max: number | null;
  width_um_min: number | null;
  width_um_max: number | null;
  outer_structures: StructureEntry[];
  surface_features: StructureEntry[];
  base_body_template: string | null;
  symmetry: string | null;
  body_complexity: string | null;
  segmentation_strategy: string | null;
  default_clickable_regions: string[];
  modeling_notes: string | null;
  knowledge_confidence: string;
  missing_critical_data: string[];
  source_reliability_notes: string | null;
  notes: string | null;
}

const BACTERIA_DATA: BacteriaEnrichment[] = [
  {
    name: 'Escherichia coli',
    scientific_name: 'Escherichia coli',
    shape_family: 'bacillus',
    cell_shape: 'rod',
    arrangement: 'single cells or pairs',
    gram_status: 'negative',
    motility: 'variable',
    motility_mechanism: ['flagella'],
    curvature: 'straight',
    length_um_min: 1.0,
    length_um_max: 2.0,
    width_um_min: 0.5,
    width_um_max: 1.0,
    outer_structures: [
      {
        name: 'Outer membrane',
        normalized_name: 'outer_membrane',
        presence: 'present',
        clickable_candidate: true,
        visual_priority: 1,
        description:
          'Gram-negative outer membrane with LPS; defines surface antigenic character.',
        notes: null,
      },
      {
        name: 'Cell wall',
        normalized_name: 'cell_wall',
        presence: 'present',
        clickable_candidate: true,
        visual_priority: 2,
        description:
          'Thin peptidoglycan layer between outer membrane and plasma membrane.',
        notes: null,
      },
      {
        name: 'Capsule',
        normalized_name: 'capsule',
        presence: 'variable',
        clickable_candidate: true,
        visual_priority: 3,
        description:
          'Polysaccharide capsule (K antigen) present in many pathogenic strains; absent in many lab strains.',
        notes: 'Strain-dependent; not a universal species-level feature.',
      },
      {
        name: 'Flagella',
        normalized_name: 'flagella',
        presence: 'variable',
        clickable_candidate: true,
        visual_priority: 2,
        description:
          'Peritrichous flagella enabling swimming motility; absent in non-motile strains.',
        notes: 'Peritrichous distribution when present.',
        // Filament diameter ~20 nm (unsheathed; well-measured by cryo-EM).
        // Typical length 5–10 µm; 7 µm used as mid-range representative value.
        diameter_nm: 20,
        length_um: 7.0,
        // Normal (left-handed) helical waveform. Wavelength 2.22 µm and amplitude
        // ~0.4 µm are the best-characterised values from flagellar reconstruction.
        // Rotation: CCW when viewed from the filament tip toward the cell body =
        // bundling and forward run.
        waveform_type: 'helical',
        wavelength_um: 2.22,
        amplitude_um: 0.4,
        handedness: 'left',
        rotation_dir: 'ccw',
      },
      {
        name: 'Fimbriae',
        normalized_name: 'fimbriae',
        presence: 'variable',
        clickable_candidate: true,
        visual_priority: 3,
        description:
          'Type 1 and other fimbriae present in many strains; short adhesin filaments.',
        notes: 'Strain- and growth-condition-dependent.',
        // Type 1 fimbriae: helical rods ~7 nm outer diameter, 1–2 µm length.
        // Right-handed helix; not actively rotated (non-motility structure).
        diameter_nm: 7,
        length_um: 1.5,
        waveform_type: 'helical',
        wavelength_um: 0.024,
        amplitude_um: 0.0,
        handedness: 'right',
        rotation_dir: null,
      },
    ],
    surface_features: [
      {
        name: 'Smooth surface',
        normalized_name: 'smooth_surface',
        presence: 'present',
        clickable_candidate: false,
        visual_priority: 3,
        description: 'Smooth outer membrane surface in standard rod form.',
        notes: null,
      },
      {
        name: 'Peritrichous flagella',
        normalized_name: 'peritrichous_flagella',
        presence: 'variable',
        clickable_candidate: true,
        visual_priority: 1,
        description:
          'Multiple flagella distributed around the entire cell surface when motility genes are expressed.',
        notes: null,
      },
    ],
    base_body_template: 'rod',
    symmetry: 'simple_axial',
    body_complexity: 'moderate',
    segmentation_strategy: 'body_plus_appendages',
    default_clickable_regions: [
      'body',
      'outer_membrane',
      'cell_wall',
      'flagellum',
      'fimbriae',
      'capsule',
    ],
    modeling_notes:
      'Standard gram-negative rod. Use layered cylinder: plasma membrane, thin peptidoglycan, outer membrane. Peritrichous flagella as optional scattered appendages. Capsule as a diffuse outer halo. No distinctive curvature.',
    knowledge_confidence: 'high',
    missing_critical_data: [],
    source_reliability_notes:
      'Most-studied bacterium; morphology well-characterized by decades of EM and biochemistry.',
    notes:
      'Flagella and capsule are strain-variable. Core rod morphology and gram-negative envelope are universal to the species.',
  },
  {
    name: 'Mycobacterium tuberculosis',
    scientific_name: 'Mycobacterium tuberculosis',
    shape_family: 'bacillus',
    cell_shape: 'rod',
    arrangement: 'single cells; loose parallel bundles (cord factor) in some strains',
    gram_status: 'variable',
    motility: 'non_motile',
    motility_mechanism: [],
    curvature: 'straight',
    length_um_min: 1.0,
    length_um_max: 4.0,
    width_um_min: 0.2,
    width_um_max: 0.5,
    outer_structures: [
      {
        name: 'Mycomembrane',
        normalized_name: 'outer_membrane',
        presence: 'present',
        clickable_candidate: true,
        visual_priority: 1,
        description:
          'Mycolic acid-rich outer lipid bilayer (mycomembrane); highly hydrophobic and waxy. Unique to mycobacteria.',
        notes: 'Not equivalent to gram-negative outer membrane; no LPS.',
      },
      {
        name: 'Cell wall',
        normalized_name: 'cell_wall',
        presence: 'present',
        clickable_candidate: true,
        visual_priority: 2,
        description:
          'Complex wall of peptidoglycan cross-linked to arabinogalactan, directly beneath the mycomembrane.',
        notes: null,
      },
    ],
    surface_features: [
      {
        name: 'Smooth waxy surface',
        normalized_name: 'smooth_surface',
        presence: 'present',
        clickable_candidate: false,
        visual_priority: 2,
        description:
          'Highly hydrophobic waxy outer surface due to mycolic acids; resists standard Gram staining.',
        notes: null,
      },
    ],
    base_body_template: 'rod',
    symmetry: 'simple_axial',
    body_complexity: 'moderate',
    segmentation_strategy: 'layered_shell',
    default_clickable_regions: ['body', 'cell_wall', 'outer_membrane'],
    modeling_notes:
      'Thin, straight rod with distinctive multi-layered cell envelope: plasma membrane, peptidoglycan, arabinogalactan, mycomembrane. No flagella, pili, or capsule. Cord-forming is a colony-level pattern, not a single-cell morphology feature.',
    knowledge_confidence: 'high',
    missing_critical_data: [
      'outer surface protein spatial arrangement for 3D detail',
      'loosely associated outer capsule-like layer dimensions',
    ],
    source_reliability_notes:
      'Highly studied pathogen; cell wall biochemistry and ultrastructure are very well characterized by cryo-EM.',
    notes:
      'Gram stain unreliable; classified acid-fast. No motility structures. Distinctive feature is the mycolic acid envelope, not appendages.',
  },
  {
    name: 'Staphylococcus aureus',
    scientific_name: 'Staphylococcus aureus',
    shape_family: 'coccus',
    cell_shape: 'sphere',
    arrangement: 'irregular grape-like clusters',
    gram_status: 'positive',
    motility: 'non_motile',
    motility_mechanism: [],
    curvature: 'none',
    length_um_min: null,
    length_um_max: null,
    width_um_min: 0.5,
    width_um_max: 1.5,
    outer_structures: [
      {
        name: 'Cell wall',
        normalized_name: 'cell_wall',
        presence: 'present',
        clickable_candidate: true,
        visual_priority: 1,
        description:
          'Thick gram-positive peptidoglycan layer with wall teichoic acids; primary outer structural layer.',
        notes: null,
      },
      {
        name: 'Capsule',
        normalized_name: 'capsule',
        presence: 'variable',
        clickable_candidate: true,
        visual_priority: 2,
        description:
          'Polysaccharide microcapsule (CP5 or CP8 serotypes) present in many clinical isolates.',
        notes: 'Strain-dependent. Laboratory strains such as ATCC 25923 often acapsular.',
      },
    ],
    surface_features: [
      {
        name: 'Smooth surface',
        normalized_name: 'smooth_surface',
        presence: 'present',
        clickable_candidate: false,
        visual_priority: 3,
        description:
          'Spherical cells with smooth gram-positive outer surface; no appendages.',
        notes: null,
      },
    ],
    base_body_template: 'coccus',
    symmetry: 'radial',
    body_complexity: 'simple',
    segmentation_strategy: 'chain_or_cluster',
    default_clickable_regions: ['body', 'cell_wall', 'capsule'],
    modeling_notes:
      'Simple sphere. Render as grape-like irregular cluster of 4–20 cells. Thick cell wall as a visible outer shell layer. No flagella or pili. Capsule as an optional thin halo around individual cells.',
    knowledge_confidence: 'high',
    missing_critical_data: [],
    source_reliability_notes:
      'Major clinical pathogen; morphology extensively characterized by EM.',
    notes:
      'No motility structures. Clustering in multiple planes is the defining visible arrangement feature.',
  },
  {
    name: 'Vibrio cholerae',
    scientific_name: 'Vibrio cholerae',
    shape_family: 'vibrio',
    cell_shape: 'curved rod',
    arrangement: 'single cells',
    gram_status: 'negative',
    motility: 'motile',
    motility_mechanism: ['flagella'],
    curvature: 'curved',
    length_um_min: 1.5,
    length_um_max: 3.0,
    width_um_min: 0.5,
    width_um_max: 0.8,
    outer_structures: [
      {
        name: 'Outer membrane',
        normalized_name: 'outer_membrane',
        presence: 'present',
        clickable_candidate: true,
        visual_priority: 1,
        description:
          'Gram-negative outer membrane with LPS; O antigen defines serogroup (O1, O139).',
        notes: null,
      },
      {
        name: 'Cell wall',
        normalized_name: 'cell_wall',
        presence: 'present',
        clickable_candidate: true,
        visual_priority: 2,
        description:
          'Thin gram-negative peptidoglycan layer between outer and plasma membranes.',
        notes: null,
      },
      {
        name: 'Polar flagellum',
        normalized_name: 'flagellum',
        presence: 'present',
        clickable_candidate: true,
        visual_priority: 1,
        description:
          'Single polar sheathed flagellum; sheath is continuous with the outer membrane.',
        notes:
          'Membrane sheath distinguishes Vibrio flagellum from unsheathed flagella in most bacteria.',
        // Sheathed flagellum outer diameter ~38 nm (filament ~18 nm + outer membrane
        // sheath adds ~20 nm, giving ~35–40 nm total; cryo-ET studies of V. cholerae).
        // Typical length ~5–7 µm; 6 µm used as representative value.
        diameter_nm: 38,
        length_um: 6.0,
        // Sheath dampens the helical geometry into an approximately sinusoidal planar
        // wave as observed in EM images. Wavelength ~1.8 µm, amplitude ~0.3 µm.
        // Underlying filament is left-handed; rotation CCW from tip = swimming.
        waveform_type: 'sinusoidal',
        wavelength_um: 1.8,
        amplitude_um: 0.3,
        handedness: 'left',
        rotation_dir: 'ccw',
      },
      {
        name: 'Capsule',
        normalized_name: 'capsule',
        presence: 'variable',
        clickable_candidate: true,
        visual_priority: 3,
        description:
          'Polysaccharide capsule present in O139 serogroup strains; absent or minimal in O1 El Tor.',
        notes: 'Serogroup-dependent; not universal to the species.',
      },
      {
        name: 'Toxin co-regulated pili',
        normalized_name: 'pili',
        presence: 'variable',
        clickable_candidate: true,
        visual_priority: 2,
        description:
          'Type IV TCP pili critical for colonization; expressed under virulence-inducing conditions.',
        notes:
          'Pathogenic strains under virulence conditions; not constitutively expressed.',
        // TCP pili: ~8 nm diameter (type IV class); length variable up to ~5 µm.
        // Right-handed helix; retractile — not freely rotating.
        diameter_nm: 8,
        length_um: 3.0,
        waveform_type: 'helical',
        wavelength_um: 0.041,
        amplitude_um: 0.0,
        handedness: 'right',
        rotation_dir: null,
      },
    ],
    surface_features: [
      {
        name: 'Comma-shaped curvature',
        normalized_name: 'other',
        presence: 'present',
        clickable_candidate: false,
        visual_priority: 1,
        description:
          'Single-axis curve giving the cell a comma or crescent profile; species-defining morphology.',
        notes: null,
      },
      {
        name: 'Single polar flagellum',
        normalized_name: 'polar_flagellum',
        presence: 'present',
        clickable_candidate: true,
        visual_priority: 1,
        description:
          'Sheathed polar flagellum visible as a long undulating appendage at one cell pole.',
        notes: null,
      },
    ],
    base_body_template: 'curved_rod',
    symmetry: 'simple_axial',
    body_complexity: 'moderate',
    segmentation_strategy: 'body_plus_appendages',
    default_clickable_regions: [
      'body',
      'outer_membrane',
      'cell_wall',
      'flagellum',
      'pili',
      'capsule',
    ],
    modeling_notes:
      'Curved comma-shaped rod with a single long sheathed polar flagellum. Body curvature is the primary shape-defining feature. Flagellum is enclosed in a membrane sheath (render as a slightly thicker filament). Capsule and pili are condition/serogroup-variable.',
    knowledge_confidence: 'high',
    missing_critical_data: [
      'flagellum sheath outer diameter at cryo-EM resolution for accurate 3D proportions',
    ],
    source_reliability_notes:
      'Well-characterized pathogen; ultrastructure data from multiple EM and cryo-ET studies.',
    notes:
      'Single sheathed polar flagellum is the most visually distinctive appendage. Comma curvature is species-defining and must be reflected in the base body template.',
  },
];

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const repo = app.get<Repository<Microbe>>(getRepositoryToken(Microbe));

  let updated = 0;
  let notFound = 0;

  for (const data of BACTERIA_DATA) {
    try {
      const microbe = await repo.findOne({ where: { name: data.name } });
      if (!microbe) {
        console.warn(`enrich-bacteria || lookup || microbe not found: ${data.name} || 🦘`);
        notFound += 1;
        continue;
      }

      microbe.shape_family = data.shape_family;
      microbe.cell_shape = data.cell_shape;
      microbe.arrangement = data.arrangement;
      microbe.gram_status = data.gram_status;
      microbe.motility = data.motility;
      microbe.motility_mechanism = data.motility_mechanism;
      microbe.curvature = data.curvature;
      microbe.length_um_min = data.length_um_min;
      microbe.length_um_max = data.length_um_max;
      microbe.width_um_min = data.width_um_min;
      microbe.width_um_max = data.width_um_max;
      microbe.outer_structures = data.outer_structures;
      microbe.surface_features = data.surface_features;
      microbe.base_body_template = data.base_body_template;
      microbe.symmetry = data.symmetry;
      microbe.body_complexity = data.body_complexity;
      microbe.segmentation_strategy = data.segmentation_strategy;
      microbe.default_clickable_regions = data.default_clickable_regions;
      microbe.modeling_notes = data.modeling_notes;
      microbe.knowledge_confidence = data.knowledge_confidence;
      microbe.missing_critical_data = data.missing_critical_data;
      microbe.source_reliability_notes = data.source_reliability_notes;
      microbe.notes = data.notes;

      await repo.save(microbe);
      console.log(`  enriched: ${data.name}`);
      updated += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`enrich-bacteria || saving ${data.name} || ${message} || 🐙`);
    }
  }

  console.log(`\nDone. Updated: ${updated}  Not found: ${notFound}`);
  await app.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
