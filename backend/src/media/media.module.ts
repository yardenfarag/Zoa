import { Module } from '@nestjs/common';
import { R2MediaService } from './r2-media.service';

@Module({
  providers: [R2MediaService],
  exports: [R2MediaService],
})
export class MediaModule {}
