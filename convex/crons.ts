import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "cleanup unreferenced CDN resources",
  { hours: 720 }, // every 30 days
  internal.cdnCleanup.cleanupUnreferencedCdnResources,
  {},
);

export default crons;
