import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { R2MediaService } from './media/r2-media.service';
import { MicrobesService } from './microbes/microbes.service';

async function main() {
  /** `--force` is swallowed by root `npm run … -- --force`; use `npm run sync-images:api:force` or `--replace` / SYNC_IMAGES_FORCE=1. */
  const force =
    process.argv.includes('--force') ||
    process.argv.includes('--replace') ||
    process.env.SYNC_IMAGES_FORCE === '1';
  const app = await NestFactory.createApplicationContext(AppModule);
  const r2 = app.get(R2MediaService);
  if (r2.isEnabled()) {
    console.error(
      `[sync-images] R2 upload ON → bucket "${r2.bucketName()}" (objects + public URLs in DB)`,
    );
  } else {
    const missing = r2.missingEnvKeys();
    console.error(
      `[sync-images] R2 upload OFF — only Wikimedia URLs will be saved. Missing or empty: ${missing.join(', ') || '(check R2_*)'}. See backend/.env.example`,
    );
    console.error(
      `[sync-images] After setting R2_*, run: npm run sync-images:api:force (replace existing Commons URLs)`,
    );
  }
  if (!force) {
    console.error(
      `[sync-images] force=${force} (rows that already have image_urls are skipped; use sync-images:api:force to re-upload)`,
    );
  }
  const microbes = app.get(MicrobesService);
  const result = await microbes.backfillImagesFromCommons({ force });
  console.log(JSON.stringify(result, null, 2));
  await app.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
