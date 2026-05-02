import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BodySegment, Microbe, StructureEntry } from './microbes/microbe.entity';

/**
 * Enriches Plasmodium falciparum with blood-stage morphology (ring inside RBC)
 * for the procedural ParasiteViewer.
 *
 * Run once via: npm run enrich:parasites
 */

interface ParasiteEnrichment {
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
  body_segments: BodySegment[];
}

/** Origin at RBC centre; z_offset_um → Three.js +Y */
const PLASMODIUM_SEGMENT_LAYOUT: BodySegment[] = [
  {
    id: 'erythrocyte_shell',
    geometry: 'sphere',
    radius_um: 3.5,
    height_um: 0,
    z_offset_um: 0,
    x_offset_um: 0,
  },
  {
    id: 'parasite_cytoplasm_ring',
    geometry: 'thin_torus',
    radius_um: 0.52,
    height_um: 0.085,
    z_offset_um: 1.25,
    x_offset_um: 0,
  },
  {
    id: 'digestive_vacuole',
    geometry: 'sphere',
    radius_um: 0.24,
    height_um: 0,
    z_offset_um: 1.25,
    x_offset_um: 0.32,
  },
  {
    id: 'nucleus',
    geometry: 'sphere',
    radius_um: 0.13,
    height_um: 0,
    z_offset_um: 1.25,
    x_offset_um: -0.34,
  },
];

const PARASITE_DATA: ParasiteEnrichment[] = [
  {
    name: 'Plasmodium falciparum',
    width_um_min: 6.5,
    width_um_max: 7.8,
    length_um_min: 6.5,
    length_um_max: 7.8,
    outer_structures: [
      {
        name: 'Erythrocyte (host cell envelope)',
        normalized_name: 'erythrocyte_shell',
        presence: 'present',
        clickable_candidate: true,
        visual_priority: 1,
        description:
          'Schematic intact human erythrocyte membrane ghost (~7 µm diameter). Stage-specific knobs and PfEMP1 antigen display are omitted in this pedagogical figurine.',
        notes: null,
      },
      {
        name: 'Parasite cytoplasm (ring)',
        normalized_name: 'parasite_cytoplasm_ring',
        presence: 'present',
        clickable_candidate: true,
        visual_priority: 2,
        description:
          'Early trophozoite “ring” stage: peripheral cytoplasm outlining a large parasite vacuole. In blood smears it appears as a thin blue hoop with membrane-bound pigment developing later.',
        notes:
          'Trophozoites ingest host haemoglobin; hemozoin aggregates form as the parasite matures.',
      },
      {
        name: 'Digestive vacuole',
        normalized_name: 'digestive_vacuole',
        presence: 'present',
        clickable_candidate: true,
        visual_priority: 2,
        description:
          'Acidic organelle dedicated to proteolysis of host haemoglobin; site of biocrystallisation of malaria pigment (hemozoin/beta-hematin) in mature stages.',
        notes: null,
      },
      {
        name: 'Chromatin nucleus',
        normalized_name: 'nucleus',
        presence: 'present',
        clickable_candidate: true,
        visual_priority: 2,
        description:
          'Haploid nuclear DNA at early ring stages often appears as a single dense dot adjacent to the vacuole in Giemsa-stained preparations.',
        notes: null,
      },
    ],
    base_body_template: 'plasmodium_blood_stage',
    default_clickable_regions: [
      'erythrocyte_shell',
      'parasite_cytoplasm_ring',
      'digestive_vacuole',
      'nucleus',
    ],
    modeling_notes:
      'Host sphere + schematic ring torus biased toward cortex; digestive vacuole and chromatin nucleus offset on opposite sides.',
    knowledge_confidence: 'high',
    missing_critical_data: ['exact ring geometry varies with imaging plane and strain'],
    source_reliability_notes:
      'Classic parasitology teaching morphology; schematic not a volumetric reconstruction.',
    notes:
      'The most lethal human malaria species; parasite exports proteins that remodel infected erythrocytes for cytoadherence and immune evasion (not modeled here).',
    body_segments: PLASMODIUM_SEGMENT_LAYOUT,
  },
];

/**
 * Persists morphology for Plasmodium falciparum when seeding creates the row first.
 *
 * @param repo - Microbe TypeORM repository
 * @returns True when Plasmodium was found and saved
 */
export async function applyPlasmodiumEnrichment(
  repo: Repository<Microbe>,
): Promise<boolean> {
  const payload = PARASITE_DATA[0];
  try {
    const microbe = await repo.findOne({ where: { name: payload.name } });
    if (!microbe) {
      return false;
    }
    microbe.width_um_min = payload.width_um_min;
    microbe.width_um_max = payload.width_um_max;
    microbe.length_um_min = payload.length_um_min;
    microbe.length_um_max = payload.length_um_max;
    microbe.outer_structures = payload.outer_structures;
    microbe.base_body_template = payload.base_body_template;
    microbe.default_clickable_regions = payload.default_clickable_regions;
    microbe.modeling_notes = payload.modeling_notes;
    microbe.knowledge_confidence = payload.knowledge_confidence;
    microbe.missing_critical_data = payload.missing_critical_data;
    microbe.source_reliability_notes = payload.source_reliability_notes;
    microbe.notes = payload.notes;
    microbe.body_segments = payload.body_segments;
    await repo.save(microbe);
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(
      `applyPlasmodiumEnrichment || saving ${payload.name} || ${message} || 🦊`,
    );
    return false;
  }
}

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const repo = app.get<Repository<Microbe>>(getRepositoryToken(Microbe));

  let updated = 0;
  let notFound = 0;

  for (const data of PARASITE_DATA) {
    try {
      const microbe = await repo.findOne({ where: { name: data.name } });
      if (!microbe) {
        console.warn(
          `enrich-parasites || lookup || microbe not found: ${data.name} || 🦎`,
        );
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
      console.error(
        `enrich-parasites || saving ${data.name} || ${message} || 🐊`,
      );
    }
  }

  console.log(`\nDone. Updated: ${updated}  Not found: ${notFound}`);
  await app.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
