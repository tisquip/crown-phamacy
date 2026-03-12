import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

// ── Shared audit & soft-delete field groups ────────────────────────────
/** Audit fields stamped on every insert / update. */
const auditFields = {
  lastModifiedBy: v.optional(v.id("users")),
  lastModifiedAt: v.optional(v.number()),
};

/** Soft-delete fields for entity tables that can be archived. */
const softDeleteFields = {
  isDeleted: v.optional(v.boolean()),
  deletedAt: v.optional(v.number()),
  deletedBy: v.optional(v.id("users")),
};

export default defineSchema({
  ...authTables,
  userProfile: defineTable({
    userId: v.id("users"),
    name: v.optional(v.string()),
    phoneNumber: v.optional(v.string()),
    addresses: v.optional(v.array(v.string())),
    preferredBranch: v.optional(v.id("branch")),
    selectedCity: v.optional(v.string()),
    isAdmin: v.optional(v.boolean()),
    ...auditFields,
  })
    .index("byUserId", ["userId"])
    .index("adminIndex", ["isAdmin"])
    .searchIndex("search_name", { searchField: "name" }),
  branch: defineTable({
    name: v.string(),
    address: v.string(),
    city: v.string(),
    cell: v.string(),
    landline: v.string(),
    email: v.string(),
    comingSoon: v.boolean(),
  }),

  productCategory: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    storageIdImage: v.optional(v.id("_storage")),
    cdnImageUrl: v.optional(v.string()),
    cdnImageKey: v.optional(v.string()),
    productIds: v.optional(v.array(v.id("products"))),
    ...auditFields,
    ...softDeleteFields,
  })
    .index("by_name_and_isDeleted", ["name", "isDeleted"])
    .index("by_isDeleted_and_name", ["isDeleted", "name"]),
  productBrand: defineTable({
    name: v.string(),
    ...auditFields,
    ...softDeleteFields,
  })
    .index("by_name_and_isDeleted", ["name", "isDeleted"])
    .index("by_isDeleted_and_name", ["isDeleted", "name"]),

  productReview: defineTable({
    productId: v.id("products"),
    userId: v.id("users"),
    rating: v.number(),
    comment: v.optional(v.string()),
    ...auditFields,
    ...softDeleteFields,
  })
    .index("by_productId_and_isDeleted", ["productId", "isDeleted"])
    .index("by_userId_and_isDeleted", ["userId", "isDeleted"]),

  products: defineTable({
    name: v.string(),
    productCategoryIds: v.optional(v.array(v.id("productCategory"))),
    storageIdsImages: v.optional(v.array(v.id("_storage"))),
    cdnImages: v.optional(
      v.array(v.object({ url: v.string(), key: v.string() })),
    ),
    stockCode: v.string(),
    description: v.string(),
    detailedDescription: v.optional(v.string()),
    barcode: v.optional(v.string()),
    brandId: v.optional(v.id("productBrand")),
    retailPriceInUSDCents: v.number(),
    promotionPriceInUSDCents: v.optional(v.number()),
    bulkOfferPriceInUSDCents: v.optional(v.number()),
    bulkOfferQty: v.optional(v.number()),
    isMedicine: v.boolean(),
    isPrescriptionControlled: v.boolean(),
    purchaseCount: v.optional(v.number()),
    inStock: v.boolean(),
    packSize: v.optional(v.string()),
    ...auditFields,
    ...softDeleteFields,
  })
    .index("by_isDeleted_and_name", ["isDeleted", "name"])
    .index("by_isDeleted_and_retailPrice", [
      "isDeleted",
      "retailPriceInUSDCents",
    ])
    .index("by_isDeleted_and_purchaseCount", ["isDeleted", "purchaseCount"])
    .index("by_isDeleted_and_promotionPrice", [
      "isDeleted",
      "promotionPriceInUSDCents",
    ])
    .index("by_isDeleted_and_bulkOfferPrice", [
      "isDeleted",
      "bulkOfferPriceInUSDCents",
    ])
    .index("by_stockCode", ["stockCode"])
    .index("by_productCategoryId_and_isDeleted", [
      "productCategoryIds",
      "isDeleted",
    ])
    .index("by_brand_and_isDeleted", ["brandId", "isDeleted"])
    .index("by_isDeleted_and_isMedicine", ["isDeleted", "isMedicine"])
    .index("by_isDeleted_and_isPrescriptionControlled", [
      "isDeleted",
      "isPrescriptionControlled",
    ]),
  /**
   * Unified order table — combines the previous `purchaseReceipt` and `order`
   * tables into a single entity that tracks both the transactional purchase
   * data and the order lifecycle / fulfilment data.
   */
  order: defineTable({
    clientId: v.id("users"),
    // Purchase receipt fields
    productIds: v.array(v.id("products")),
    adminWhoCreatedOrder: v.optional(v.id("users")),
    productsAsJsonOnDateOfPurchase: v.string(),
    uploadedPrescriptionIds: v.optional(v.array(v.id("uploadedPrescription"))),
    // Order lifecycle fields
    status: v.union(
      v.literal("pending"),
      v.literal("confirmed"),
      v.literal("processing"),
      v.literal("dispatched"),
      v.literal("delivered"),
      v.literal("collected"),
      v.literal("cancelled"),
    ),
    deliveryMethod: v.optional(
      v.union(v.literal("delivery"), v.literal("collection")),
    ),
    branchCollection: v.optional(v.id("branch")),
    address: v.optional(v.string()),
    phoneNumber: v.optional(v.string()),
    paymentMethod: v.optional(
      v.union(v.literal("cash"), v.literal("ecocash"), v.literal("bank")),
    ),
    notes: v.optional(v.string()),
    // Price fields (unified naming)
    subtotalInUSDCents: v.number(),
    deliveryFeeInUSDCents: v.number(),
    orderIsCollection: v.boolean(),
    totalInUSDCents: v.number(),
    ...auditFields,
  })
    .index("by_clientId", ["clientId"])
    .index("by_status", ["status"]),
  medicationPurchasedByClient: defineTable({
    clientId: v.id("users"),
    productId: v.id("products"),
  })
    .index("by_clientId_and_productId", ["clientId", "productId"])
    .index("by_productId_and_clientId", ["productId", "clientId"]),

  uploadedPrescription: defineTable({
    storageId: v.id("_storage"),
    clientId: v.id("users"),
    status: v.union(
      v.literal("Uploaded"),
      v.literal("Quotation Sent"),
      v.literal("Purchased"),
      v.literal("Cancelled"),
    ),
    // Additional notes
    notes: v.optional(v.string()),
    // File metadata for rendering
    fileName: v.optional(v.string()),
    fileType: v.optional(v.string()), // "pdf" | "image"
    ...auditFields,
  })
    .index("by_clientId", ["clientId"])
    .index("by_status", ["status"])
    .index("by_storageId", ["storageId"]),
  heroSlide: defineTable({
    title: v.string(),
    subtitle: v.string(),
    image: v.optional(v.id("_storage")),
    cdnImageUrl: v.optional(v.string()),
    cdnImageKey: v.optional(v.string()),
    buttonText: v.string(),
    buttonLink: v.string(),
    active: v.boolean(),
    order: v.number(),
    ...auditFields,
  })
    .index("by_order", ["order"])
    .index("by_active_and_order", ["active", "order"]),

  homepageSection: defineTable({
    sectionType: v.union(
      v.literal("topSellers"),
      v.literal("itemsOnPromotion"),
      v.literal("shopByCategory"),
      v.literal("promoBanner"),
      v.literal("featuredBrands"),
    ),
    productIds: v.optional(v.array(v.id("products"))),
    categoryIds: v.optional(v.array(v.id("productCategory"))),
    brandIds: v.optional(v.array(v.id("productBrand"))),
    isAutoGenerated: v.boolean(),
    // Promo banner–specific fields
    storageId: v.optional(v.id("_storage")),
    cdnImageUrl: v.optional(v.string()),
    cdnImageKey: v.optional(v.string()),
    badgeText: v.optional(v.string()),
    headlineText: v.optional(v.string()),
    buttonText: v.optional(v.string()),
    buttonLink: v.optional(v.string()),
    ...auditFields,
  }).index("by_sectionType", ["sectionType"]),

  advertBanner: defineTable({
    storageId: v.optional(v.id("_storage")),
    cdnImageUrl: v.optional(v.string()),
    cdnImageKey: v.optional(v.string()),
    link: v.optional(v.string()),
    order: v.number(),
    isCarousel: v.optional(v.boolean()),
    carouselImages: v.optional(
      v.array(v.object({ cdnImageUrl: v.string(), cdnImageKey: v.string() })),
    ),
    ...auditFields,
  }).index("by_order", ["order"]),

  fullAdvertBanner: defineTable({
    cdnImageUrl: v.optional(v.string()),
    cdnImageKey: v.optional(v.string()),
    storageId: v.optional(v.id("_storage")),
    link: v.optional(v.string()),
    order: v.number(),
    ...auditFields,
  }).index("by_order", ["order"]),

  siteSettings: defineTable({
    key: v.string(),
    deliveryPriceInUSDCents: v.number(),
    freeDeliveryThresholdInUSDCents: v.number(),
    ...auditFields,
  }).index("by_key", ["key"]),

  wishlistItem: defineTable({
    userId: v.id("users"),
    productId: v.id("products"),
    ...auditFields,
  })
    .index("by_userId_and_productId", ["userId", "productId"])
    .index("by_userId", ["userId"]),

  cartItem: defineTable({
    userId: v.id("users"),
    productId: v.id("products"),
    quantity: v.number(),
    ...auditFields,
  })
    .index("by_userId_and_productId", ["userId", "productId"])
    .index("by_userId", ["userId"]),

  productBulkUpload: defineTable({
    storageId: v.id("_storage"),
    fileName: v.optional(v.string()),
    status: v.union(
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed"),
    ),
    productsAdded: v.optional(
      v.array(v.object({ stockCode: v.string(), name: v.string() })),
    ),
    productsUpdated: v.optional(
      v.array(
        v.object({
          stockCode: v.string(),
          name: v.string(),
          changes: v.array(v.string()),
        }),
      ),
    ),
    productsUntouched: v.optional(
      v.array(v.object({ stockCode: v.string(), name: v.string() })),
    ),
    errorMessage: v.optional(v.string()),
    uploadedBy: v.id("users"),
    uploadedAt: v.number(),
    completedAt: v.optional(v.number()),
  }),
  paymentTransaction: defineTable({
    orderId: v.id("order"),
    userId: v.id("users"),
    amountInUSDCents: v.number(),
    status: v.union(
      v.literal("pending"),
      v.literal("paid"),
      v.literal("failed"),
    ),
    paymentMethod: v.union(
      v.literal("cash"),
      v.literal("ecocash"),
      v.literal("bank"),
    ),
    transactionReference: v.optional(v.string()),
    pollUrl: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
    processedAt: v.optional(v.number()),
  })
    .index("by_orderId", ["orderId"])
    .index("by_userId", ["userId"]),
  blogPost: defineTable({
    title: v.string(),
    slug: v.string(),
    excerpt: v.optional(v.string()),
    contentAsMarkdown: v.string(),
    authorId: v.id("users"),
    publishedAt: v.optional(v.number()),
    isPublished: v.boolean(),
    storageIdImage: v.optional(v.id("_storage")),
    cdnImageUrl: v.optional(v.string()),
    cdnImageKey: v.optional(v.string()),
    ...auditFields,
    ...softDeleteFields,
  })
    .index("by_slug", ["slug"])
    .index("by_isPublished_and_publishedAt", ["isPublished", "publishedAt"])
    .index("by_isDeleted_and_isPublished", ["isDeleted", "isPublished"]),

  newsletterSubscription: defineTable({
    email: v.string(),
  }).index("by_email", ["email"]),
});
