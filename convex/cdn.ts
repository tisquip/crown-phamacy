"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

const BUCKET = "crown-pharmacy";

function getS3Client(): S3Client {
  return new S3Client({
    endpoint: process.env.S3_ENDPOINT!,
    region: "us-east-1",
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY!,
      secretAccessKey: process.env.S3_SECRET_KEY!,
    },
    forcePathStyle: true,
  });
}

/**
 * Upload a file to the CDN.
 *
 * Accepts the file as a base64-encoded string (Convex action args must be
 * JSON-serializable). Returns the public CDN URL and the S3 key so the
 * caller can store both — the URL for display and the key for future deletion.
 */
export const uploadFile = action({
  args: {
    key: v.string(),
    base64Data: v.string(),
    contentType: v.string(),
  },
  returns: v.object({
    cdnUrl: v.string(),
    key: v.string(),
  }),
  handler: async (_ctx, args) => {
    const s3 = getS3Client();
    const body = Buffer.from(args.base64Data, "base64");

    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: args.key,
        Body: body,
        ContentType: args.contentType,
      }),
    );

    const cdnUrl = `${process.env.CDN_BASE_URL}/${BUCKET}/${args.key}`;
    return { cdnUrl, key: args.key };
  },
});

/**
 * Delete a file from the CDN by its S3 key.
 */
export const deleteFile = action({
  args: {
    key: v.string(),
  },
  returns: v.null(),
  handler: async (_ctx, args) => {
    const s3 = getS3Client();

    await s3.send(
      new DeleteObjectCommand({
        Bucket: BUCKET,
        Key: args.key,
      }),
    );

    return null;
  },
});
