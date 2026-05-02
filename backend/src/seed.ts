import { NestFactory } from '@nestjs/core';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppModule } from './app.module';
import { applyPlasmodiumEnrichment } from './enrich-parasites';
import { MicrobesService } from './microbes/microbes.service';
import { Microbe } from './microbes/microbe.entity';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const microbes = app.get(MicrobesService);
  const result = await microbes.seedDefaults();
  console.log(
    result.inserted > 0
      ? `Seeded ${result.inserted} microbes.`
      : 'Database already contains microbes; nothing inserted.',
  );
  if (result.inserted > 0) {
    const repo = app.get<Repository<Microbe>>(getRepositoryToken(Microbe));
    const morphologyOk = await applyPlasmodiumEnrichment(repo);
    if (morphologyOk) {
      console.log('Applied Plasmodium blood-stage morphology (seed).');
    }
  }
  await app.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
