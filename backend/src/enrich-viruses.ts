import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BodySegment, Microbe, StructureEntry } from './microbes/microbe.entity';

/**
 * Enriches the 4 virus records with morphology, outer structure, surface
 * feature, and procedural model hint data including body_segments for T4.
 *
 * Run once via: npm run enrich:viruses
 * Re-running is safe — existing fields are overwritten.
 */

interface VirusEnrichment {
  name: string;
  width_um_min: number | null;
  width_um_max: number | null;
  length_um_min: number | null;
  length_um_max: number | null;
  outer_structures: StructureEntry[];
  base_body_template: string;
  default_clickable_regions: string[];
  modeling_notes: string;
  knowledge_confidence: string;
  missing_critical_data: string[];
  source_reliability_notes: string;
  notes: string;
  body_segments: BodySegment[] | null;
}

// ── T4 segment layout ─────────────────────────────────────────────────────
//
// All measurements in µm. Coordinate origin at the centre of the full assembly.
// Total height ≈ 223 nm; centred so head is above and baseplate is below.
//
//  +0.054  head centre        (115 nm tall elongated icosahedron, 86 nm wide)
//  -0.010  collar centre      (13 nm tall cylinder, 50 nm wide)
//  -0.0565 tail sheath centre (80 nm tall cylinder, 25 nm wide)
//  -0.104  baseplate centre   (15 nm tall disc, 60 nm wide)
//  -0.104  tail fibers anchor (145 nm long, projecting from baseplate edge)

const T4_SEGMENTS: BodySegment[] = [
  {
    id: 'head',
    geometry: 'elongated_icosahedron',
    radius_um: 0.043,
    height_um: 0.115,
    z_offset_um: 0.054,
  },
  {
    id: 'collar',
    geometry: 'cylinder',
    radius_um: 0.025,
    height_um: 0.013,
    z_offset_um: -0.010,
  },
  {
    id: 'tail_sheath',
    geometry: 'cylinder',
    radius_um: 0.0125,
    height_um: 0.080,
    z_offset_um: -0.0565,
  },
  {
    id: 'baseplate',
    geometry: 'disc',
    radius_um: 0.030,
    height_um: 0.015,
    z_offset_um: -0.104,
  },
  {
    id: 'tail_fibers',
    geometry: 'thin_cylinders_6',
    radius_um: 0.0015,
    height_um: 0.145,
    z_offset_um: -0.104,
  },
];

const VIRUS_DATA: VirusEnrichment[] = [
  // ── SARS-CoV-2 ────────────────────────────────────────────────────────────
  {
    name: 'SARS-CoV-2',
    // Diameter 60–140 nm in cryo-ET studies; 80–120 nm representative range
    width_um_min: 0.060,
    width_um_max: 0.140,
    length_um_min: null,
    length_um_max: null,
    outer_structures: [
      {
        name: 'Lipid envelope',
        normalized_name: 'envelope',
        presence: 'present',
        clickable_candidate: true,
        visual_priority: 1,
        description:
          'Host-derived lipid bilayer membrane surrounding the nucleocapsid.',
        notes: null,
      },
      {
        name: 'Spike protein (S)',
        normalized_name: 'spike_protein',
        presence: 'present',
        clickable_candidate: true,
        visual_priority: 1,
        description:
          'Homotrimeric S glycoprotein; binds ACE2 receptor to initiate cell entry. ~90 copies per virion.',
        notes: 'Each spike is a trimer ~11.5 nm tall and ~6 nm in diameter.',
        // Individual spike dimensions (cryo-ET average)
        diameter_nm: 6,
        length_um: 0.0115,
      },
      {
        name: 'Membrane protein (M)',
        normalized_name: 'matrix',
        presence: 'present',
        clickable_candidate: true,
        visual_priority: 2,
        description:
          'M protein forms the matrix layer just inside the envelope; most abundant structural protein.',
        notes: null,
      },
      {
        name: 'Envelope protein (E)',
        normalized_name: 'outer_membrane',
        presence: 'present',
        clickable_candidate: true,
        visual_priority: 3,
        description:
          'Small E protein; ion channel activity and important for virion assembly and budding.',
        notes: 'Very few copies per virion (~20); renders as part of the envelope layer.',
      },
    ],
    base_body_template: 'enveloped_sphere',
    default_clickable_regions: ['body', 'envelope', 'spike_protein', 'matrix'],
    modeling_notes:
      'Render as a sphere (~100 nm diameter) with ~25 S-protein spike trimers distributed uniformly on the surface. Spikes are club-shaped (slightly wider at the tip). Add a thin transparent envelope layer.',
    knowledge_confidence: 'high',
    missing_critical_data: ['exact spike copy number per virion varies by strain'],
    source_reliability_notes:
      'Cryo-ET reconstructions from multiple 2020–2022 studies provide detailed structural data.',
    notes:
      'S protein is the primary immunogen and drug target. Its characteristic crown appearance gives coronaviruses their name.',
    body_segments: null,
  },

  // ── Influenza A ───────────────────────────────────────────────────────────
  {
    name: 'Influenza A virus',
    // Roughly spherical; laboratory-adapted strains 80–120 nm; clinical strains can be filamentous
    width_um_min: 0.080,
    width_um_max: 0.120,
    length_um_min: null,
    length_um_max: null,
    outer_structures: [
      {
        name: 'Lipid envelope',
        normalized_name: 'envelope',
        presence: 'present',
        clickable_candidate: true,
        visual_priority: 1,
        description:
          'Host-derived lipid bilayer envelope; studded densely with two types of surface glycoprotein.',
        notes: null,
      },
      {
        name: 'Hemagglutinin (HA)',
        normalized_name: 'hemagglutinin',
        presence: 'present',
        clickable_candidate: true,
        visual_priority: 1,
        description:
          'Homotrimeric mushroom-shaped spike; binds sialic acid on host cells to initiate entry. ~80% of surface spikes.',
        notes:
          '18 antigenic subtypes (H1–H18); antigenic drift in HA drives annual vaccine reformulation.',
        diameter_nm: 5,
        length_um: 0.014,
      },
      {
        name: 'Neuraminidase (NA)',
        normalized_name: 'neuraminidase',
        presence: 'present',
        clickable_candidate: true,
        visual_priority: 1,
        description:
          'Homotetramer "mushroom on a stalk" shape; cleaves sialic acid to allow virion release from infected cells.',
        notes:
          '11 antigenic subtypes (N1–N11); target of antiviral drugs oseltamivir (Tamiflu) and zanamivir.',
        diameter_nm: 6,
        length_um: 0.015,
      },
      {
        name: 'Matrix layer (M1)',
        normalized_name: 'matrix',
        presence: 'present',
        clickable_candidate: true,
        visual_priority: 2,
        description:
          'M1 protein forms a rigid matrix shell beneath the envelope that determines virion shape.',
        notes: null,
      },
    ],
    base_body_template: 'enveloped_sphere',
    default_clickable_regions: ['body', 'envelope', 'hemagglutinin', 'neuraminidase', 'matrix'],
    modeling_notes:
      'Render as a sphere (~100 nm) with two distinct spike types on the surface: ~20 HA spikes (mushroom) and ~5 NA spikes (prop-on-stick). Both rendered as short cylinders; different colours distinguish types.',
    knowledge_confidence: 'high',
    missing_critical_data: [],
    source_reliability_notes:
      'One of the best-studied enveloped viruses; surface spike ratios and dimensions confirmed by cryo-ET.',
    notes:
      'HA:NA ratio is approximately 4:1 in typical strains. Both are targets for immunity and antiviral drugs.',
    body_segments: null,
  },

  // ── HIV ───────────────────────────────────────────────────────────────────
  {
    name: 'HIV',
    // Mature virion ~120 nm; immature ~145 nm; wide range reported
    width_um_min: 0.100,
    width_um_max: 0.145,
    length_um_min: null,
    length_um_max: null,
    outer_structures: [
      {
        name: 'Lipid envelope',
        normalized_name: 'envelope',
        presence: 'present',
        clickable_candidate: true,
        visual_priority: 1,
        description:
          'Host-derived lipid bilayer; acquired when the virion buds from the T cell plasma membrane.',
        notes: null,
      },
      {
        name: 'Env spike (gp120/gp41)',
        normalized_name: 'spike_protein',
        presence: 'present',
        clickable_candidate: true,
        visual_priority: 1,
        description:
          'Heterotrimeric Env glycoprotein trimer: gp120 (receptor binding) and gp41 (fusion). ~72 spikes per virion — far fewer than other enveloped viruses.',
        notes:
          'The low spike density is a strategy to evade antibody neutralisation. Target of broadly neutralising antibodies (bNAbs).',
        diameter_nm: 10,
        length_um: 0.014,
      },
      {
        name: 'Matrix (MA / p17)',
        normalized_name: 'matrix',
        presence: 'present',
        clickable_candidate: true,
        visual_priority: 2,
        description:
          'MA (p17) matrix protein shell immediately beneath the envelope; mediates association between envelope and capsid.',
        notes: null,
      },
      {
        name: 'Conical capsid (CA / p24)',
        normalized_name: 'capsid',
        presence: 'present',
        clickable_candidate: true,
        visual_priority: 2,
        description:
          'Fullerene-cone shaped capsid made of ~1,200 CA (p24) subunits; contains two copies of genomic RNA and reverse transcriptase.',
        notes:
          'The cone shape is unique among retroviruses; ~40 nm wide, ~120 nm long. Target of lenacapavir capsid inhibitor.',
      },
    ],
    base_body_template: 'enveloped_sphere',
    default_clickable_regions: ['body', 'envelope', 'spike_protein', 'matrix'],
    modeling_notes:
      'Render as a sphere (~120 nm). Add ~15 sparse gp120/gp41 spikes (far fewer than other enveloped viruses). Notably sparse spike density is a key immunoevasion feature.',
    knowledge_confidence: 'high',
    missing_critical_data: [],
    source_reliability_notes:
      'Extensively studied; cryo-ET has provided atomic-level resolution of the Env spike and capsid.',
    notes:
      'Immature vs. mature virion shapes differ (immature is more spherical with a complete Gag shell). This model represents the mature infectious form.',
    body_segments: null,
  },

  // ── Bacteriophage T4 ──────────────────────────────────────────────────────
  {
    name: 'Bacteriophage T4',
    // Head width 86 nm, full assembly height ~220 nm
    width_um_min: 0.086,
    width_um_max: 0.086,
    length_um_min: 0.220,
    length_um_max: 0.220,
    outer_structures: [
      {
        name: 'Icosahedral head (capsid)',
        normalized_name: 'head',
        presence: 'present',
        clickable_candidate: true,
        visual_priority: 1,
        description:
          'Prolate (elongated) T=13,20 icosahedral head, 86 nm wide and 115 nm tall. Contains the ~170 kb dsDNA genome tightly packaged at near-crystalline density.',
        notes: 'gp23* makes up the facets; gp24* forms the 11 vertices; gp20 the unique portal vertex.',
      },
      {
        name: 'Collar',
        normalized_name: 'collar',
        presence: 'present',
        clickable_candidate: true,
        visual_priority: 2,
        description:
          'Connector ring between head and tail; formed by gp13 and gp14 proteins. Transfers mechanical force during DNA injection.',
        notes: null,
      },
      {
        name: 'Contractile tail sheath',
        normalized_name: 'tail_sheath',
        presence: 'present',
        clickable_candidate: true,
        visual_priority: 1,
        description:
          'Helical sheath of gp18 protein subunits surrounds the rigid inner tail tube. Contracts like a spring to drive the tail tube through the bacterial cell wall during infection.',
        notes:
          'Extended sheath is ~80 nm long; upon contraction it shortens to ~35 nm and widens. This model shows the extended (pre-infection) state.',
      },
      {
        name: 'Baseplate',
        normalized_name: 'baseplate',
        presence: 'present',
        clickable_candidate: true,
        visual_priority: 1,
        description:
          'Hexagonal ~60 nm baseplate assembly of ~150 proteins. Acts as a molecular sentinel: remains in a "locked" conformation until multiple tail fibers bind LPS simultaneously.',
        notes: 'Conformational change in the baseplate triggers tail sheath contraction.',
      },
      {
        name: 'Long tail fibers',
        normalized_name: 'tail_fibers',
        presence: 'present',
        clickable_candidate: true,
        visual_priority: 1,
        description:
          'Six long tail fibers (~145 nm each) fold back against the tail when inactive and splay outward to contact host LPS receptors. Gp37 at each tip is the host-range determinant.',
        notes: 'Tail fiber tip specificity determines which E. coli strains the phage can infect.',
      },
    ],
    base_body_template: 'complex_phage',
    default_clickable_regions: ['head', 'collar', 'tail_sheath', 'baseplate', 'tail_fibers'],
    modeling_notes:
      'Multi-segment structure rendered top-to-bottom: elongated icosahedral head, collar ring, contractile tail sheath (outer cylinder), flat hexagonal baseplate, six angled tail fibers projecting from baseplate corners.',
    knowledge_confidence: 'high',
    missing_critical_data: [],
    source_reliability_notes:
      'One of the most structurally characterised phages; multiple cryo-EM and cryo-ET structures at near-atomic resolution.',
    notes:
      'T4 is a model system for phage biology. The tail injection machinery is one of the most complex molecular machines known.',
    body_segments: T4_SEGMENTS,
  },
];

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const repo = app.get<Repository<Microbe>>(getRepositoryToken(Microbe));

  let updated = 0;
  let notFound = 0;

  for (const data of VIRUS_DATA) {
    try {
      const microbe = await repo.findOne({ where: { name: data.name } });
      if (!microbe) {
        console.warn(`enrich-viruses || lookup || microbe not found: ${data.name} || 🦎`);
        notFound += 1;
        continue;
      }

      microbe.width_um_min = data.width_um_min;
      microbe.width_um_max = data.width_um_max;
      microbe.length_um_min = data.length_um_min;
      microbe.length_um_max = data.length_um_max;
      microbe.outer_structures = data.outer_structures;
      microbe.base_body_template = data.base_body_template;
      microbe.default_clickable_regions = data.default_clickable_regions;
      microbe.modeling_notes = data.modeling_notes;
      microbe.knowledge_confidence = data.knowledge_confidence;
      microbe.missing_critical_data = data.missing_critical_data;
      microbe.source_reliability_notes = data.source_reliability_notes;
      microbe.notes = data.notes;
      microbe.body_segments = data.body_segments;

      await repo.save(microbe);
      console.log(`  enriched: ${data.name}`);
      updated += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`enrich-viruses || saving ${data.name} || ${message} || 🐊`);
    }
  }

  console.log(`\nDone. Updated: ${updated}  Not found: ${notFound}`);
  await app.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
