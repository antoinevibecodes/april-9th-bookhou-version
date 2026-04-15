import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';

@Injectable()
export class UploadsService {
  private s3: S3Client;
  private bucket: string;

  constructor(private config: ConfigService) {
    this.s3 = new S3Client({
      region: this.config.get('AWS_REGION', 'us-east-1'),
      credentials: {
        accessKeyId: this.config.get('AWS_ACCESS_KEY_ID', ''),
        secretAccessKey: this.config.get('AWS_SECRET_ACCESS_KEY', ''),
      },
    });
    this.bucket = this.config.get('AWS_S3_BUCKET', 'bookhou-uploads');
  }

  // Generate a presigned URL for direct upload from frontend
  async getPresignedUploadUrl(params: {
    folder: string; // e.g. 'banners', 'waivers', 'gallery'
    contentType: string;
    fileExtension: string;
  }) {
    const key = `${params.folder}/${randomUUID()}.${params.fileExtension}`;

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: params.contentType,
    });

    const uploadUrl = await getSignedUrl(this.s3, command, { expiresIn: 3600 });

    return {
      uploadUrl,
      key,
      fileUrl: `https://${this.bucket}.s3.amazonaws.com/${key}`,
    };
  }

  // Upload a buffer directly (for server-side uploads like PDF invoices)
  async uploadBuffer(params: {
    folder: string;
    fileName: string;
    buffer: Buffer;
    contentType: string;
  }): Promise<string> {
    const key = `${params.folder}/${randomUUID()}-${params.fileName}`;

    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: params.buffer,
        ContentType: params.contentType,
      }),
    );

    return `https://${this.bucket}.s3.amazonaws.com/${key}`;
  }

  // Delete a file from S3
  async deleteFile(key: string) {
    await this.s3.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );
    return { message: 'File deleted' };
  }
}
