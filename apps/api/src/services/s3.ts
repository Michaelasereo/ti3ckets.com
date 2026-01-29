import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

export class S3Service {
  private s3Client: S3Client;
  private bucketName: string;

  constructor() {
    this.bucketName = process.env.AWS_S3_BUCKET || 'getiickets-s3-michael-asere';
    
    this.s3Client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-2',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      },
    });
  }

  async uploadFile(key: string, buffer: Buffer, contentType: string): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      // ACL removed - modern S3 buckets use bucket policies for public access
      // Ensure bucket policy allows public read access if needed
    });

    await this.s3Client.send(command);

    // Return CloudFront URL if configured, otherwise S3 URL
    const cloudfrontUrl = process.env.AWS_CLOUDFRONT_URL;
    if (cloudfrontUrl) {
      return `${cloudfrontUrl}/${key}`;
    }

    return `https://${this.bucketName}.s3.${process.env.AWS_REGION || 'us-east-2'}.amazonaws.com/${key}`;
  }
}
