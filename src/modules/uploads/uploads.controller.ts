import { Controller, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { UploadsService } from './uploads.service';

@ApiTags('Uploads')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('uploads')
export class UploadsController {
  constructor(private uploadsService: UploadsService) {}

  @Post('presigned-url')
  getPresignedUrl(
    @Body() data: { folder: string; contentType: string; fileExtension: string },
  ) {
    return this.uploadsService.getPresignedUploadUrl(data);
  }

  @Delete(':key')
  deleteFile(@Param('key') key: string) {
    return this.uploadsService.deleteFile(decodeURIComponent(key));
  }
}
