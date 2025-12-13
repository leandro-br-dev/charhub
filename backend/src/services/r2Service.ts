import type { Readable } from 'node:stream';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { logger } from '../config/logger';

type UploadBody = Buffer | Uint8Array | string | Readable;

export interface UploadObjectParams {
  key: string;
  body: UploadBody;
  contentType?: string;
  cacheControl?: string;
}

interface R2Config {
  bucketName: string | undefined;
  accountId: string | undefined;
  accessKeyId: string | undefined;
  secretAccessKey: string | undefined;
  endpointUrl: string | undefined;
  publicUrlBase: string | undefined;
}

const REQUIRED_CONFIG_KEYS: Array<keyof R2Config> = [
  'bucketName',
  'accountId',
  'accessKeyId',
  'secretAccessKey',
  'endpointUrl',
  'publicUrlBase',
];

export class R2ConfigurationError extends Error {
  public readonly missingKeys: string[];
  public readonly statusCode = 503;

  constructor(missingKeys: string[]) {
    super(`Cloudflare R2 configuration is incomplete: missing ${missingKeys.join(', ')}`);
    this.name = 'R2ConfigurationError';
    this.missingKeys = missingKeys;
  }
}

function loadConfig(): R2Config {
  const publicUrlBaseRaw = process.env.R2_PUBLIC_URL_BASE ? process.env.R2_PUBLIC_URL_BASE.trim() : undefined;

  return {
    bucketName: process.env.R2_BUCKET_NAME ? process.env.R2_BUCKET_NAME.trim() : undefined,
    accountId: process.env.R2_ACCOUNT_ID ? process.env.R2_ACCOUNT_ID.trim() : undefined,
    accessKeyId: process.env.R2_ACCESS_KEY_ID ? process.env.R2_ACCESS_KEY_ID.trim() : undefined,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ? process.env.R2_SECRET_ACCESS_KEY.trim() : undefined,
    endpointUrl: process.env.R2_ENDPOINT_URL ? process.env.R2_ENDPOINT_URL.trim() : undefined,
    publicUrlBase: publicUrlBaseRaw ? publicUrlBaseRaw.replace(/\/+$/, '') : undefined,
  };
}

function sanitizeKey(key: string): string {
  return key.replace(/^\/+/, '').replace(/\\/g, '/');
}

export class R2Service {
  private readonly config: R2Config;
  private readonly missingConfig: string[];
  private readonly client: S3Client | null;

  constructor() {
    this.config = loadConfig();
    this.missingConfig = REQUIRED_CONFIG_KEYS.filter(key => !this.config[key]);

    if (this.missingConfig.length > 0) {
      logger.warn({ missing: this.missingConfig }, 'Cloudflare R2 configuration is incomplete. Service will be disabled.');
      this.client = null;
      return;
    }

    this.client = new S3Client({
      region: 'auto',
      endpoint: this.config.endpointUrl,
      forcePathStyle: true,
      credentials: {
        accessKeyId: this.config.accessKeyId as string,
        secretAccessKey: this.config.secretAccessKey as string,
      },
    });

    logger.info('Cloudflare R2 client configured successfully.');
  }

  public isConfigured(): boolean {
    return this.client !== null;
  }

  public getMissingConfig(): string[] {
    return [...this.missingConfig];
  }

  private ensureClient(): S3Client {
    if (!this.client) {
      throw new R2ConfigurationError(this.missingConfig);
    }
    return this.client;
  }

  public getPublicUrl(objectKey: string): string {
    if (!this.isConfigured()) {
      throw new R2ConfigurationError(this.missingConfig);
    }

    const cleanKey = sanitizeKey(objectKey);
    return `${this.config.publicUrlBase}/${cleanKey}`;
  }

  public async uploadObject(params: UploadObjectParams): Promise<{ key: string; publicUrl: string }> {
    const client = this.ensureClient();
    const cleanKey = sanitizeKey(params.key);

    try {
      await client.send(
        new PutObjectCommand({
          Bucket: this.config.bucketName,
          Key: cleanKey,
          Body: params.body,
          ContentType: params.contentType || 'application/octet-stream',
          CacheControl: params.cacheControl,
        })
      );

      const publicUrl = this.getPublicUrl(cleanKey);
      logger.debug({ key: cleanKey }, 'Uploaded object to Cloudflare R2');

      return { key: cleanKey, publicUrl };
    } catch (error) {
      logger.error({ err: error, key: cleanKey }, 'Failed to upload object to Cloudflare R2');
      throw Object.assign(new Error('Failed to upload file to Cloudflare R2'), { cause: error, statusCode: 502 });
    }
  }

  /**
   * Generate a presigned URL for temporary access to an object
   * @param key - Object key in R2
   * @param expiresIn - Expiration time in seconds (default: 1 hour)
   * @returns Presigned URL that grants temporary access
   */
  public async getPresignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    const client = this.ensureClient();
    const cleanKey = sanitizeKey(key);

    try {
      const command = new GetObjectCommand({
        Bucket: this.config.bucketName,
        Key: cleanKey,
      });

      const presignedUrl = await getSignedUrl(client, command, { expiresIn });
      logger.debug({ key: cleanKey, expiresIn }, 'Generated presigned URL for R2 object');

      return presignedUrl;
    } catch (error) {
      logger.error({ err: error, key: cleanKey }, 'Failed to generate presigned URL');
      throw Object.assign(new Error('Failed to generate presigned URL'), { cause: error, statusCode: 502 });
    }
  }

  /**
   * Download an object directly from R2
   * @param key - Object key in R2
   * @returns Buffer containing the object data
   */
  public async downloadObject(key: string): Promise<Buffer> {
    const client = this.ensureClient();
    const cleanKey = sanitizeKey(key);

    try {
      const command = new GetObjectCommand({
        Bucket: this.config.bucketName,
        Key: cleanKey,
      });

      const response = await client.send(command);

      if (!response.Body) {
        throw new Error('No data received from R2');
      }

      // Convert stream to buffer
      const chunks: Uint8Array[] = [];
      for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
        chunks.push(chunk);
      }
      const buffer = Buffer.concat(chunks);

      logger.debug({ key: cleanKey, sizeBytes: buffer.length }, 'Downloaded object from R2');
      return buffer;
    } catch (error) {
      logger.error({ err: error, key: cleanKey }, 'Failed to download object from R2');
      throw Object.assign(new Error('Failed to download file from Cloudflare R2'), { cause: error, statusCode: 502 });
    }
  }
}

export const r2Service = new R2Service();
