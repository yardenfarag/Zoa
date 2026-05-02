import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseEnumPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { MicrobeType } from './microbe-type.enum';
import { MicrobesService } from './microbes.service';
import { CreateMicrobeDto } from './dto/create-microbe.dto';
import { UpdateMicrobeDto } from './dto/update-microbe.dto';
import { UploadImageDto } from './dto/upload-image.dto';
import { toRenderSpec } from './render-spec.mapper';

@Controller('microbes')
export class MicrobesController {
  constructor(private readonly microbesService: MicrobesService) {}

  @Get()
  findByType(
    @Query('type', new ParseEnumPipe(MicrobeType)) type: MicrobeType,
  ) {
    return this.microbesService.findByType(type);
  }

  @Get(':id')
  async findOne(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    const microbe = await this.microbesService.findOne(id);
    if (!microbe) {
      throw new NotFoundException(`Microbe ${id} not found`);
    }
    return microbe;
  }

  @Post()
  create(@Body() dto: CreateMicrobeDto) {
    return this.microbesService.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateMicrobeDto,
  ) {
    return this.microbesService.update(id, dto);
  }

  /**
   * Returns a minimal procedural render spec for the given microbe.
   * Always returns 200 — check the `renderable` flag in the response.
   * Returns 404 only when the microbe UUID does not exist.
   */
  @Get(':id/render-spec')
  async renderSpec(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    const microbe = await this.microbesService.findOne(id);
    if (!microbe) {
      throw new NotFoundException(`Microbe ${id} not found`);
    }
    return toRenderSpec(microbe);
  }

  /**
   * Downloads a Wikimedia Commons image from a caller-supplied URL, uploads it
   * to Cloudflare R2, and saves the public URL. Intended to be called by the
   * Cursor agent after it has evaluated multiple Commons candidates with Vision
   * and selected the best one(s).
   */
  @Post(':id/upload-image')
  uploadImage(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UploadImageDto,
  ) {
    return this.microbesService.uploadImageFromUrl(
      id,
      dto.sourceUrl,
      dto.mode ?? 'overwrite',
    );
  }
}
