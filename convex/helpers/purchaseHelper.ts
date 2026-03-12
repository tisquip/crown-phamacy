import { GenericMutationCtx } from "convex/server";
import { DataModel, Id } from "../_generated/dataModel";

/**
 * Shared purchase helper — the single source of truth for all purchase logic.
 *
 * Responsibilities:
 * 1. Creates an `order` document (unified order + receipt).
 * 2. Increments `purchaseCount` on every purchased product.
 * 3. For medicine / prescription-controlled products, inserts a
 *    `medicationPurchasedByClient` entry (skips duplicates).
 * 4. Optionally saves phone/address to the user profile if they don't have one yet.
 * 5. If the user has no preferredBranch, sets it from branchCollection and
 *    populates selectedCity from the branch's city.
 *
 * Call this from any mutation that creates a purchase — never duplicate this logic.
 */
export async function executePurchase(
  ctx: GenericMutationCtx<DataModel>,
  adminUserId: Id<"users"> | null,
  args: {
    clientId: Id<"users">;
    productIds: Array<Id<"products">>;
    productsAsJsonOnDateOfPurchase: string;
    subtotalInUSDCents: number;
    deliveryFeeInUSDCents: number;
    totalInUSDCents: number;
    uploadedPrescriptionIds: Array<Id<"uploadedPrescription">>;
    phoneNumber?: string;
    address?: string;
    // Order-specific fields (optional for admin-created purchases)
    status?:
      | "pending"
      | "confirmed"
      | "processing"
      | "dispatched"
      | "delivered"
      | "collected"
      | "cancelled";
    deliveryMethod?: "delivery" | "collection";
    branchCollection?: Id<"branch">;
    orderIsCollection: boolean;
    paymentMethod?: "cash" | "ecocash" | "bank";
    notes?: string;
  },
): Promise<Id<"order">> {
  const {
    clientId,
    productIds,
    uploadedPrescriptionIds,
    subtotalInUSDCents,
    deliveryFeeInUSDCents,
    totalInUSDCents,
    phoneNumber,
    address,
    status,
    deliveryMethod,
    branchCollection,
    orderIsCollection,
    paymentMethod,
    notes,
  } = args;

  // 1. Create the unified order document
  const orderId: Id<"order"> = await ctx.db.insert("order", {
    clientId,
    productIds,
    uploadedPrescriptionIds:
      uploadedPrescriptionIds.length > 0 ? uploadedPrescriptionIds : undefined,
    adminWhoCreatedOrder: adminUserId ?? undefined,
    productsAsJsonOnDateOfPurchase: args.productsAsJsonOnDateOfPurchase,
    subtotalInUSDCents,
    deliveryFeeInUSDCents,
    totalInUSDCents,
    status: status ?? "confirmed",
    deliveryMethod,
    branchCollection,
    orderIsCollection,
    phoneNumber,
    address,
    paymentMethod,
    notes,
    lastModifiedBy: adminUserId ?? undefined,
    lastModifiedAt: Date.now(),
  });

  // 2. Increment purchaseCount on each product & track medication purchases
  for (const productId of productIds) {
    const product = await ctx.db.get(productId);
    if (!product) continue;

    // Increment purchaseCount
    await ctx.db.patch(productId, {
      purchaseCount: (product.purchaseCount ?? 0) + 1,
      lastModifiedAt: Date.now(),
    });

    // Track medicine/controlled medication purchases per client
    if (product.isMedicine || product.isPrescriptionControlled) {
      const existing = await ctx.db
        .query("medicationPurchasedByClient")
        .withIndex("by_clientId_and_productId", (q) =>
          q.eq("clientId", clientId).eq("productId", productId),
        )
        .unique();
      if (!existing) {
        await ctx.db.insert("medicationPurchasedByClient", {
          clientId,
          productId,
        });
      }
    }
  }

  // 3. Save phone/address to user profile and set preferredBranch if needed
  {
    const profile = await ctx.db
      .query("userProfile")
      .withIndex("byUserId", (q) => q.eq("userId", clientId))
      .unique();
    if (profile) {
      const updates: Record<string, unknown> = {};

      // Save phone to profile if profile doesn't have one yet
      if (phoneNumber && !profile.phoneNumber) {
        updates.phoneNumber = phoneNumber;
      }

      if (address) {
        const existingAddresses = profile.addresses ?? [];
        if (!existingAddresses.includes(address)) {
          updates.addresses = [...existingAddresses, address];
        }
      }

      // If user has no preferredBranch and a branch was selected, set it
      if (branchCollection && !profile.preferredBranch) {
        updates.preferredBranch = branchCollection;
        // Also populate selectedCity from the branch
        const branch = await ctx.db.get(branchCollection);
        if (branch) {
          updates.selectedCity = branch.city;
        }
      }

      if (Object.keys(updates).length > 0) {
        updates.lastModifiedAt = Date.now();
        await ctx.db.patch(profile._id, updates);
      }
    }
  }

  return orderId;
}
