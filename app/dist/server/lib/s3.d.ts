import { S3Client } from '@aws-sdk/client-s3';
export declare const s3Client: S3Client;
export declare function ensureS3Bucket(): Promise<void>;
export declare function uploadFile(key: string, body: string | Uint8Array | Buffer, contentType?: string): Promise<string>;
export declare function getFileUrl(key: string): string;
export declare function getS3BucketName(): string;
