import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';
import { MicrobeType } from '../microbe-type.enum';

export class CreateMicrobeDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  size: string;

  @IsString()
  @MinLength(1)
  @MaxLength(300)
  natural_habitat: string;

  @IsString()
  @MinLength(1)
  capabilities: string;

  @IsString()
  @MinLength(1)
  description: string;

  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  image_urls?: string[];

  @IsEnum(MicrobeType)
  type: MicrobeType;
}
