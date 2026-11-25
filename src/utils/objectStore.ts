/**
 * Optional copy of every upload in Cloudflare R2.
 *
 * Render's free plan has no persistent disk: files under ./uploads vanish on
 * every restart or deploy, while the database keeps pointing at them. When the
 * R2_* variables are set, each upload is also written to an R2 bucket, and a
 * file that is missing on disk is fetched back from R2 the first time it is
 * requested. URLs stay the same (/uploads/...), so the app and the portal need
 * no change. With the variables unset (local development) nothing here runs.
 *
 * Objects are keyed by their path under ./uploads, e.g. "documents/file-1.jpg".
 */
import fs from 'fs';
import path from 'path';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { logger } from './logger';

export const UPLOADS_ROOT = path.join(process.cwd(), 'uploads');

let bucket = '';
let cached: S3Client | null | undefined;

// Built on first use so the values from .env (dotenv) are already loaded
function getClient(): S3Client | null {
  if (cached !== undefined) return cached;
  const accountId = process.env.R2_ACCOUNT_ID?.trim();
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();
  bucket = process.env.R2_BUCKET?.trim() || '';
  // R2_ENDPOINT overrides the default endpoint (tests, or a jurisdiction endpoint)
  const endpoint =
    process.env.R2_ENDPOINT?.trim() || (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : '');
  cached =
    endpoint && accessKeyId && secretAccessKey && bucket
      ? new S3Client({
          region: 'auto',
          endpoint,
          forcePathStyle: true,
          credentials: { accessKeyId, secretAccessKey },
        })
      : null;
  if (cached) logger.info(`Uploads are mirrored to R2 bucket "${bucket}"`);
  return cached;
}

export const objectStoreEnabled = (): boolean => getClient() !== null;

/** "documents/file-1.jpg" for an absolute path under ./uploads, or null. */
export function keyFor(absPath: string): string | null {
  const rel = path.relative(UPLOADS_ROOT, absPath).replace(/\\/g, '/');
  if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) return null;
  return rel;
}

/** Copies a file already written under ./uploads to R2. Throws on failure. */
export async function putFromDisk(absPath: string, contentType?: string): Promise<void> {
  const client = getClient();
  if (!client) return;
  const key = keyFor(absPath);
  if (!key) return;
  const body = await fs.promises.readFile(absPath);
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType || 'application/octet-stream',
    }),
  );
}

/**
 * Makes sure ./uploads/<key> exists on disk, downloading it from R2 when it is
 * missing. Returns true when the file is on disk afterwards.
 */
export async function ensureLocal(key: string): Promise<boolean> {
  const clean = path.posix.normalize(key).replace(/^\/+/, '');
  if (!clean || clean.startsWith('..')) return false;
  const absPath = path.join(UPLOADS_ROOT, clean);
  if (fs.existsSync(absPath)) return true;
  const client = getClient();
  if (!client) return false;

  try {
    const out = await client.send(new GetObjectCommand({ Bucket: bucket, Key: clean }));
    if (!out.Body) return false;
    const bytes = await out.Body.transformToByteArray();
    await fs.promises.mkdir(path.dirname(absPath), { recursive: true });
    const tmp = `${absPath}.${process.pid}.part`;
    await fs.promises.writeFile(tmp, bytes);
    await fs.promises.rename(tmp, absPath);
    return true;
  } catch (err: any) {
    if (err?.name !== 'NoSuchKey' && err?.$metadata?.httpStatusCode !== 404) {
      logger.error(`R2 download failed for ${clean}: ${err?.message || err}`);
    }
    return false;
  }
}

/** Removes an object from R2; failures are logged, never thrown. */
export async function removeObject(key: string): Promise<void> {
  const client = getClient();
  if (!client) return;
  try {
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  } catch (err: any) {
    logger.error(`R2 delete failed for ${key}: ${err?.message || err}`);
  }
}
