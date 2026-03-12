"use node";

import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import {
  S3Client,
  ListObjectsV2Command,
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
 * List all objects in the crown-pharmacy S3 bucket and delete any that
 * are not referenced by an entity in the database.
 *
 * Only touches the "crown-pharmacy" bucket — other buckets on the shared
 * CDN are left untouched.
 */
export const cleanupUnreferencedCdnResources = internalAction({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    // 1. Get the set of all keys the app still references.
    const referencedKeys: Array<string> = await ctx.runQuery(
      internal.cdnCleanupQueries.getAllReferencedCdnKeys,
      {},
    );
    const referencedSet = new Set(referencedKeys);

    // 2. List every object currently in the crown-pharmacy bucket.
    const s3 = getS3Client();
    const allBucketKeys: Array<string> = [];
    let continuationToken: string | undefined;

    do {
      const listResponse = await s3.send(
        new ListObjectsV2Command({
          Bucket: BUCKET,
          ContinuationToken: continuationToken,
        }),
      );

      if (listResponse.Contents) {
        for (const obj of listResponse.Contents) {
          if (obj.Key) {
            allBucketKeys.push(obj.Key);
          }
        }
      }

      continuationToken = listResponse.IsTruncated
        ? listResponse.NextContinuationToken
        : undefined;
    } while (continuationToken);

    // 3. Determine which bucket keys are orphaned (not referenced by any entity).
    const orphanedKeys = allBucketKeys.filter((key) => !referencedSet.has(key));

    if (orphanedKeys.length === 0) {
      console.log("CDN cleanup: no orphaned resources found.");
      return null;
    }

    console.log(
      `CDN cleanup: deleting ${orphanedKeys.length} orphaned resource(s) from bucket "${BUCKET}".`,
    );

    // 4. Delete orphaned objects one by one.
    for (const key of orphanedKeys) {
      try {
        await s3.send(
          new DeleteObjectCommand({
            Bucket: BUCKET,
            Key: key,
          }),
        );
        console.log(`  Deleted: ${key}`);
      } catch (err) {
        console.error(`  Failed to delete ${key}:`, err);
      }
    }

    return null;
  },
});
