import { IsArray, IsOptional, IsString, IsUrl, MaxLength, MinLength } from 'class-validator';

export class UpdateMicrobeDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  size?: string;

  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  image_urls?: string[];
}
