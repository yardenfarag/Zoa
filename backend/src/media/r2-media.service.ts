import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';

function extensionForMime(contentType: string): string {
  const ct = contentType.split(';')[0]?.trim().toLowerCase() ?? '';
  if (ct === 'image/jpeg' || ct === 'image/jpg') return 'jpg';
  if (ct === 'image/png') return 'png';
  if (ct === 'image/webp') return 'webp';
  if (ct === 'image/gif') return 'gif';
  if (ct === 'image/avif') return 'avif';
  return 'bin';
}

@Injectable()
export class R2MediaService {
  private readonly client: S3Client | null;
  private readonly bucket: string | null;
  private readonly publicBase: string | null;

  constructor(private readonly config: ConfigService) {
    const endpoint = this.config.get<string>('R2_ENDPOINT')?.trim();
    const accessKeyId = this.config.get<string>('R2_ACCESS_KEY_ID')?.trim();
    const secretAccessKey = this.config
      .get<string>('R2_SECRET_ACCESS_KEY')
      ?.trim();
    const bucket =
      this.config.get<string>('R2_BUCKET')?.trim() ||
      'zoa-microbe-media-bucket';
    const region = this.config.get<string>('R2_REGION')?.trim() || 'auto';
    const publicBase =
      this.config
        .get<string>('R2_PUBLIC_BASE_URL')
        ?.trim()
        .replace(/\/$/, '') || null;

    if (endpoint && accessKeyId && secretAccessKey && publicBase) {
      this.client = new S3Client({
        region,
        endpoint,
        credentials: { accessKeyId, secretAccessKey },
        forcePathStyle: true,
      });
      this.bucket = bucket;
      this.publicBase = publicBase;
    } else {
      this.client = null;
      this.bucket = null;
      this.publicBase = null;
    }
  }

  /** True when R2 env is complete so sync can upload and store public URLs. */
  isEnabled(): boolean {
    return this.client !== null && !!this.bucket && !!this.publicBase;
  }

  /** Env keys that are missing or blank (for logs only; never prints secrets). */
  missingEnvKeys(): string[] {
    const need = [
      ['R2_ENDPOINT', this.config.get<string>('R2_ENDPOINT')?.trim()],
      ['R2_ACCESS_KEY_ID', this.config.get<string>('R2_ACCESS_KEY_ID')?.trim()],
      ['R2_SECRET_ACCESS_KEY', this.config.get<string>('R2_SECRET_ACCESS_KEY')?.trim()],
      ['R2_PUBLIC_BASE_URL', this.config.get<string>('R2_PUBLIC_BASE_URL')?.trim()],
    ] as const;
    return need.filter(([, v]) => !v).map(([k]) => k);
  }

  bucketName(): string {
    return (
      this.config.get<string>('R2_BUCKET')?.trim() ||
      'zoa-microbe-media-bucket'
    );
  }

  /**
   * Uploads bytes to `microbes/{microbeId}/{uuid}.{ext}` and returns the public URL.
   * Configure a public R2 hostname (custom domain or `*.r2.dev`) in `R2_PUBLIC_BASE_URL`.
   */
  async uploadMicrobeImage(params: {
    microbeId: string;
    body: Buffer;
    contentType: string;
  }): Promise<string> {
    if (!this.client || !this.bucket || !this.publicBase) {
      throw new Error(
        'R2 is not configured (set R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_PUBLIC_BASE_URL)',
      );
    }
    const ext = extensionForMime(params.contentType);
    const key = `microbes/${params.microbeId}/${randomUUID()}.${ext}`;
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: params.body,
        ContentType: params.contentType,
      }),
    );
    return `${this.publicBase}/${key}`;
  }
}
