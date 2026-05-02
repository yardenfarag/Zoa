import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Microbe } from './microbe.entity';
import { MicrobeType } from './microbe-type.enum';
import { CreateMicrobeDto } from './dto/create-microbe.dto';
import { UpdateMicrobeDto } from './dto/update-microbe.dto';
import { R2MediaService } from '../media/r2-media.service';
import {
  commonsFirstImageUrlForOrganism,
  fetchCommonsBitmap,
} from './wikimedia-commons';

type MicrobeSeederRow = Pick<
  Microbe,
  'name' | 'size' | 'natural_habitat' | 'capabilities' | 'description' | 'image_urls' | 'type'
>;

const DEFAULT_MICROBES: MicrobeSeederRow[] = [
  {
    name: 'Escherichia coli',
    size: '1–2 µm rods',
    natural_habitat: 'Mammalian lower intestine; freshwater when shed',
    capabilities:
      'Facultative anaerobe; versatile metabolism; laboratory model organism.',
    description:
      'A Gram-negative rod-shaped bacterium commonly studied in microbiology and biotechnology.',
    image_urls: [
      'https://upload.wikimedia.org/wikipedia/commons/thumb/3/39/E_coli_at_10000x%2C_edited.jpg/800px-E_coli_at_10000x%2C_edited.jpg',
    ],
    type: MicrobeType.BACTERIA,
  },
  {
    name: 'Staphylococcus aureus',
    size: '0.8–1.0 µm cocci in clusters',
    natural_habitat: 'Human skin and nares; hospital surfaces',
    capabilities:
      'Salt-tolerant; coagulase-positive strains associated with invasive infection.',
    description:
      'A Gram-positive coccus known for both benign carriage and opportunistic infections.',
    image_urls: [
      'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/Staphylococcus_aureus_VISA_2.jpg/800px-Staphylococcus_aureus_VISA_2.jpg',
    ],
    type: MicrobeType.BACTERIA,
  },
  {
    name: 'Aspergillus niger',
    size: '3–5 µm hyphal diameter (mycelial network)',
    natural_habitat: 'Soil, decaying vegetation, indoor dust',
    capabilities:
      'Strong organic acid secretion; industrial citric acid producer; common lab contaminant.',
    description:
      'A filamentous fungus with dark conidia, widely used in industry and food science.',
    image_urls: [
      'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Aspergillus_niger_01.jpg/800px-Aspergillus_niger_01.jpg',
    ],
    type: MicrobeType.FUNGUS,
  },
  {
    name: 'Candida albicans',
    size: '4–6 µm budding yeast cells',
    natural_habitat: 'Human mucosa (commensal); opportunistic in immunocompromise',
    capabilities:
      'Dimorphic yeast–hyphal switch; biofilm formation on medical devices.',
    description:
      'A yeast that normally commensalizes humans but can cause mucosal and systemic disease.',
    image_urls: [
      'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/Candida_albicans_2.jpg/800px-Candida_albicans_2.jpg',
    ],
    type: MicrobeType.FUNGUS,
  },
  {
    name: 'Bacteriophage T4',
    size: 'Head ~90 nm; tail ~120 nm',
    natural_habitat: 'Infection of Escherichia coli in aquatic and lab environments',
    capabilities:
      'Lytic replication; contractile tail injection; classic model for viral assembly.',
    description:
      'A well-studied tailed bacteriophage with iconic icosahedral head and tail machinery.',
    image_urls: [
      'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8d/Bacteriophage_T4_figure_1.jpg/800px-Bacteriophage_T4_figure_1.jpg',
    ],
    type: MicrobeType.VIRUS,
  },
  {
    name: 'Influenza A virus',
    size: '80–120 nm enveloped particles',
    natural_habitat: 'Avian and mammalian respiratory tracts',
    capabilities:
      'Antigenic drift/shift; segmented RNA genome; seasonal epidemic driver.',
    description:
      'An enveloped negative-sense RNA virus responsible for seasonal flu and pandemic risk.',
    image_urls: [
      'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/Influenza_virus_particle_01.jpg/800px-Influenza_virus_particle_01.jpg',
    ],
    type: MicrobeType.VIRUS,
  },
  {
    name: 'Plasmodium falciparum',
    size: 'Ring stages ~1–2 µm inside RBCs',
    natural_habitat: 'Anopheles mosquitoes and human blood (liver and erythrocytic stages)',
    capabilities:
      'Erythrocyte remodeling; antigenic variation; most virulent human malaria species.',
    description:
      'An apicomplexan parasite transmitted by mosquitoes, causing falciparum malaria.',
    image_urls: [
      'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/Plasmodium_falciparum.jpg/800px-Plasmodium_falciparum.jpg',
    ],
    type: MicrobeType.PARASITE,
  },
  {
    name: 'Toxoplasma gondii',
    size: '2–4 µm crescent tachyzoites',
    natural_habitat: 'Felid definitive hosts; warm-blooded intermediate hosts',
    capabilities:
      'Cyst formation in muscle/CNS; vertical transmission risk during acute maternal infection.',
    description:
      'An obligate intracellular apicomplexan with a complex two-host life cycle.',
    image_urls: [
      'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/Toxoplasma_gondii.jpg/800px-Toxoplasma_gondii.jpg',
    ],
    type: MicrobeType.PARASITE,
  },
  {
    name: 'Amoeba proteus',
    size: '250–750 µm (large amoeba)',
    natural_habitat: 'Freshwater ponds, sediments, decaying vegetation',
    capabilities:
      'Lobose pseudopodia; phagocytosis; classic teaching organism for cell motility.',
    description:
      'A free-living amoeboid protist often used to demonstrate amoeboid locomotion.',
    image_urls: [
      'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6a/Amoeba_proteus.jpg/800px-Amoeba_proteus.jpg',
    ],
    type: MicrobeType.AMOEBA,
  },
  {
    name: 'Naegleria fowleri',
    size: '10–20 µm trophozoites',
    natural_habitat: 'Warm freshwater; sediment disturbance increases exposure',
    capabilities:
      'Thermophilic; can invade olfactory neuroepithelium—rare but high-fatality CNS infection.',
    description:
      'A free-living amoeba known for primary amoebic meningoencephalitis after nasal water exposure.',
    image_urls: [
      'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0d/Naegleria_fowleri.jpg/800px-Naegleria_fowleri.jpg',
    ],
    type: MicrobeType.AMOEBA,
  },
];

@Injectable()
export class MicrobesService {
  constructor(
    @InjectRepository(Microbe)
    private readonly microbesRepository: Repository<Microbe>,
    private readonly r2Media: R2MediaService,
  ) {}

  findByType(type: MicrobeType): Promise<Microbe[]> {
    return this.microbesRepository.find({
      where: { type },
      order: { name: 'ASC' },
    });
  }

  findOne(id: string): Promise<Microbe | null> {
    return this.microbesRepository.findOne({ where: { id } });
  }

  async create(dto: CreateMicrobeDto): Promise<Microbe> {
    const entity = this.microbesRepository.create({
      ...dto,
      image_urls: dto.image_urls?.length ? dto.image_urls : [],
    });
    return this.microbesRepository.save(entity);
  }

  async update(id: string, dto: UpdateMicrobeDto): Promise<Microbe> {
    const microbe = await this.findOne(id);
    if (!microbe) {
      throw new NotFoundException(`Microbe ${id} not found`);
    }
    if (dto.image_urls !== undefined) {
      microbe.image_urls = dto.image_urls;
    }
    return this.microbesRepository.save(microbe);
  }

  /**
   * Fetches one Commons image per microbe (by scientific name) and saves it.
   * When R2 is configured (`R2_*` env), downloads the bitmap and uploads to the
   * bucket, then stores the public object URL. Otherwise stores the Commons URL.
   * Polite pacing between upstream calls.
   */
  async backfillImagesFromCommons(options?: {
    /** When true, replace existing image_urls. Default: only rows with no images. */
    force?: boolean;
  }): Promise<{
    updated: number;
    skipped: number;
    errors: string[];
    /** When true, Commons bitmaps were uploaded to R2 and DB got public object URLs. */
    r2UploadEnabled: boolean;
  }> {
    const all = await this.microbesRepository.find({ order: { name: 'ASC' } });
    let updated = 0;
    let skipped = 0;
    const errors: string[] = [];
    const force = options?.force === true;
    const r2UploadEnabled = this.r2Media.isEnabled();

    for (const m of all) {
      try {
        if (!force && m.image_urls?.length) {
          skipped += 1;
          continue;
        }
        const commonsUrl = await commonsFirstImageUrlForOrganism(m.name);
        if (!commonsUrl) {
          errors.push(`No Commons image for: ${m.name}`);
          skipped += 1;
          continue;
        }
        if (this.r2Media.isEnabled()) {
          const { body, contentType } = await fetchCommonsBitmap(commonsUrl);
          const publicUrl = await this.r2Media.uploadMicrobeImage({
            microbeId: m.id,
            body,
            contentType,
          });
          m.image_urls = [publicUrl];
        } else {
          m.image_urls = [commonsUrl];
        }
        await this.microbesRepository.save(m);
        updated += 1;
        await new Promise((r) => setTimeout(r, this.r2Media.isEnabled() ? 800 : 400));
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        errors.push(`${m.name}: ${msg}`);
      }
    }

    return { updated, skipped, errors, r2UploadEnabled };
  }

  /**
   * Downloads a Wikimedia Commons image from a given URL, uploads it to R2,
   * and saves the public URL into image_urls.
   *
   * Intended to be called by the Cursor agent after it has evaluated multiple
   * Commons candidates with Vision and selected the best one(s).
   *
   * mode='overwrite' — replaces image_urls with the new URL (default)
   * mode='append'    — adds the new URL to the existing list
   */
  async uploadImageFromUrl(
    id: string,
    sourceUrl: string,
    mode: 'append' | 'overwrite' = 'overwrite',
  ): Promise<{ imageUrl: string; microbeId: string }> {
    const microbe = await this.findOne(id);
    if (!microbe) {
      throw new NotFoundException(`Microbe ${id} not found`);
    }

    const { body, contentType } = await fetchCommonsBitmap(sourceUrl);
    const publicUrl = await this.r2Media.uploadMicrobeImage({
      microbeId: microbe.id,
      body,
      contentType,
    });

    microbe.image_urls =
      mode === 'overwrite'
        ? [publicUrl]
        : [...(microbe.image_urls ?? []), publicUrl];

    await this.microbesRepository.save(microbe);

    return { imageUrl: publicUrl, microbeId: microbe.id };
  }

  /** Inserts the 10 default archive entries when the table is empty. */
  async seedDefaults(): Promise<{ inserted: number }> {
    const count = await this.microbesRepository.count();
    if (count > 0) {
      return { inserted: 0 };
    }
    await this.microbesRepository.save(
      DEFAULT_MICROBES.map((row) => this.microbesRepository.create(row)),
    );
    return { inserted: DEFAULT_MICROBES.length };
  }
}
