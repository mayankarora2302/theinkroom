import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import fs from 'node:fs/promises';
import path from 'node:path';
import { env, maxUploadBytes } from '../config/env.js';
import { HttpError } from '../utils/http-error.js';

export interface StorageDriver {
  readonly name: string;
  upload(objectPath: string, body: Buffer, contentType: string): Promise<void>;
  remove(objectPaths: string[]): Promise<void>;
  publicUrl(objectPath: string): string;
  /** Verifies the storage backend is reachable and the bucket exists (creating it if needed). */
  init(): Promise<void>;
}

const CACHE_SECONDS = '31536000'; // object paths are unique per upload, so they can be cached forever

class SupabaseStorage implements StorageDriver {
  readonly name = 'supabase';
  private client: SupabaseClient;
  private bucket = env.SUPABASE_STORAGE_BUCKET;

  constructor() {
    this.client = createClient(env.SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  async init() {
    const { data, error } = await this.client.storage.getBucket(this.bucket);
    if (data) return;
    if (error && !/not found/i.test(error.message)) throw error;
    const created = await this.client.storage.createBucket(this.bucket, {
      public: true,
      allowedMimeTypes: ['image/webp'],
      fileSizeLimit: Math.max(maxUploadBytes, 10 * 1024 * 1024),
    });
    if (created.error) throw created.error;
    console.log(`[storage] created public bucket "${this.bucket}"`);
  }

  async upload(objectPath: string, body: Buffer, contentType: string) {
    const { error } = await this.client.storage.from(this.bucket).upload(objectPath, body, {
      contentType,
      cacheControl: CACHE_SECONDS,
      upsert: false,
    });
    if (error) {
      console.error('[storage] upload failed', error);
      throw new HttpError(502, 'STORAGE_ERROR', 'The photograph could not be saved to storage. Please try again.');
    }
  }

  async remove(objectPaths: string[]) {
    if (!objectPaths.length) return;
    const { error } = await this.client.storage.from(this.bucket).remove(objectPaths);
    if (error) console.error('[storage] remove failed', objectPaths, error);
  }

  publicUrl(objectPath: string) {
    return this.client.storage.from(this.bucket).getPublicUrl(objectPath).data.publicUrl;
  }
}

/** Development-only driver that writes files under LOCAL_UPLOAD_DIR and serves them at /media. */
class LocalStorage implements StorageDriver {
  readonly name = 'local';
  readonly root = path.resolve(env.LOCAL_UPLOAD_DIR);

  private resolve(objectPath: string) {
    const full = path.resolve(this.root, objectPath);
    if (!full.startsWith(this.root + path.sep)) throw new Error('Invalid storage path');
    return full;
  }

  async init() {
    await fs.mkdir(this.root, { recursive: true });
  }

  async upload(objectPath: string, body: Buffer) {
    const full = this.resolve(objectPath);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, body, { flag: 'wx' });
  }

  async remove(objectPaths: string[]) {
    await Promise.all(objectPaths.map((p) => fs.rm(this.resolve(p), { force: true })));
  }

  publicUrl(objectPath: string) {
    return `${env.PUBLIC_API_URL.replace(/\/$/, '')}/media/${objectPath}`;
  }
}

export const storage: StorageDriver = env.STORAGE_DRIVER === 'local' ? new LocalStorage() : new SupabaseStorage();
export const localUploadRoot = storage instanceof LocalStorage ? storage.root : null;
