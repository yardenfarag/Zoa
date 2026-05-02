import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MediaModule } from '../media/media.module';
import { Microbe } from './microbe.entity';
import { MicrobesService } from './microbes.service';
import { MicrobesController } from './microbes.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Microbe]), MediaModule],
  controllers: [MicrobesController],
  providers: [MicrobesService],
  exports: [MicrobesService],
})
export class MicrobesModule {}
