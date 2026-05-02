import { IsIn, IsOptional, IsUrl } from 'class-validator';

export class UploadImageDto {
  @IsUrl({ require_protocol: true })
  sourceUrl: string;

  @IsOptional()
  @IsIn(['append', 'overwrite'])
  mode?: 'append' | 'overwrite';
}
