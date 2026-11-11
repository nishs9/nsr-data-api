import { S3Client, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import { ReadableStream } from 'stream/web';
import sqlite3 from 'sqlite3';
import { open, type Database } from 'sqlite';

const DB_PATH = path.join(process.cwd(), 'db', 'nfl_stats.db');
const TMP_DB_PATH = `${DB_PATH}.tmp`;
const CACHE_FILE = path.join(process.cwd(), 'db', '.db_cache_info');

let connectionPromise: Promise<Database> | undefined

export function getDbConn(): Promise<Database> {
    connectionPromise ??= open({
        filename: DB_PATH,
        driver: sqlite3.Database,
        mode: sqlite3.OPEN_READONLY,
    });

    return connectionPromise;
}

interface CacheInfo {
    lastModified: string;
    etag: string;
}

async function streamToBuffer(stream: Readable): Promise<Buffer> {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
        chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
}

export async function initDb(): Promise<void> {
    
    // Check if R2 credentials are configured
    const hasR2Config = process.env.R2_ENDPOINT && 
                        process.env.R2_BUCKET_NAME && 
                        process.env.R2_ACCESS_KEY_ID && 
                        process.env.R2_SECRET_ACCESS_KEY;
    const hasLocalDbFile = fs.existsSync(DB_PATH)
    const hasMdCacheFile = fs.existsSync(CACHE_FILE)

    if (!hasR2Config) {
        if (hasLocalDbFile) {
            console.log("✓ Using local DB file since no R2 credentials are configured!")
            return;
        } else {
            throw new Error("No local DB file found and R2 credentials not configured")
        }
    }

    const client = new S3Client({
        region: 'auto',
        endpoint: process.env.R2_ENDPOINT,
        credentials: {
            accessKeyId: process.env.R2_ACCESS_KEY_ID!,
            secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
        },
    });

    try {
        const headCommand = new HeadObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: 'nfl_stats.db',
        });

        const headResponse = await client.send(headCommand);
        const remoteLastModified = headResponse.LastModified?.toISOString();
        const remoteETag = headResponse.ETag;

        let shouldDownload = true;
        if (hasMdCacheFile && hasLocalDbFile) {
            const cacheInfo: CacheInfo = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
            if (cacheInfo.lastModified === remoteLastModified && cacheInfo.etag === remoteETag) {
                shouldDownload = false;
            }
            console.log("Existing, up-to-date DB found locally. Skipping download...")
        }

        if (shouldDownload) {
            console.log("Downloading updated DB file from R2");

            const getCommand = new GetObjectCommand({
                Bucket: process.env.R2_BUCKET_NAME,
                Key: 'nfl_stats.db',
            });

            const getResponse = await client.send(getCommand);
            const responseBody = getResponse.Body;
            if (responseBody) {
                const dbStream = responseBody instanceof Readable 
                    ? responseBody 
                    : Readable.fromWeb(responseBody as ReadableStream);

                await pipeline(dbStream, fs.createWriteStream(TMP_DB_PATH));

                if (getResponse.ContentLength != null &&
                    fs.statSync(TMP_DB_PATH).size !== getResponse.ContentLength) {
                        throw new Error("Downloaded DB from R2 did not match ContentLength!");
                }

                fs.renameSync(TMP_DB_PATH, DB_PATH);

                if (remoteLastModified === undefined && remoteETag === undefined) {
                    throw new Error("Missing LastModified and ETag from R2 response");
                }

                const cacheInfo: CacheInfo = {
                    lastModified: remoteLastModified!,
                    etag: remoteETag!,
                };
                fs.writeFileSync(CACHE_FILE, JSON.stringify(cacheInfo));

                console.log("DB file downloaded and saved successfully");
            }
        }
    } catch (error) {
        console.error("Error downloading DB file:", error);
        if (fs.existsSync(DB_PATH)) {
            console.log("Using local DB file since there was an error downloading from R2");
            return;
        }
        throw new Error("Failed to download DB file from R2 and no local fallback available");
    }
}