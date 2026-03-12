/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as adminFns_advertBanners from "../adminFns/advertBanners.js";
import type * as adminFns_blogPosts from "../adminFns/blogPosts.js";
import type * as adminFns_branches from "../adminFns/branches.js";
import type * as adminFns_brands from "../adminFns/brands.js";
import type * as adminFns_bulkUpload from "../adminFns/bulkUpload.js";
import type * as adminFns_bulkUploadAction from "../adminFns/bulkUploadAction.js";
import type * as adminFns_clients from "../adminFns/clients.js";
import type * as adminFns_dashboard from "../adminFns/dashboard.js";
import type * as adminFns_fullAdvertBanners from "../adminFns/fullAdvertBanners.js";
import type * as adminFns_heroSlides from "../adminFns/heroSlides.js";
import type * as adminFns_homepageSections from "../adminFns/homepageSections.js";
import type * as adminFns_newsletter from "../adminFns/newsletter.js";
import type * as adminFns_prescriptions from "../adminFns/prescriptions.js";
import type * as adminFns_productCategories from "../adminFns/productCategories.js";
import type * as adminFns_products from "../adminFns/products.js";
import type * as adminFns_receipts from "../adminFns/receipts.js";
import type * as adminFns_siteSettings from "../adminFns/siteSettings.js";
import type * as auth from "../auth.js";
import type * as cdn from "../cdn.js";
import type * as cdnCleanup from "../cdnCleanup.js";
import type * as cdnCleanupQueries from "../cdnCleanupQueries.js";
import type * as crons from "../crons.js";
import type * as fileStorage from "../fileStorage.js";
import type * as helpers_paynowHtml from "../helpers/paynowHtml.js";
import type * as helpers_purchaseHelper from "../helpers/purchaseHelper.js";
import type * as http from "../http.js";
import type * as paymentFns_paymentActions from "../paymentFns/paymentActions.js";
import type * as paymentFns_paymentTransactions from "../paymentFns/paymentTransactions.js";
import type * as userFns_advertBanners from "../userFns/advertBanners.js";
import type * as userFns_blogPosts from "../userFns/blogPosts.js";
import type * as userFns_branches from "../userFns/branches.js";
import type * as userFns_cart from "../userFns/cart.js";
import type * as userFns_fullAdvertBanners from "../userFns/fullAdvertBanners.js";
import type * as userFns_homepage from "../userFns/homepage.js";
import type * as userFns_newsletter from "../userFns/newsletter.js";
import type * as userFns_orders from "../userFns/orders.js";
import type * as userFns_prescriptions from "../userFns/prescriptions.js";
import type * as userFns_products from "../userFns/products.js";
import type * as userFns_siteSettings from "../userFns/siteSettings.js";
import type * as userFns_userProfile from "../userFns/userProfile.js";
import type * as userFns_wishlist from "../userFns/wishlist.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "adminFns/advertBanners": typeof adminFns_advertBanners;
  "adminFns/blogPosts": typeof adminFns_blogPosts;
  "adminFns/branches": typeof adminFns_branches;
  "adminFns/brands": typeof adminFns_brands;
  "adminFns/bulkUpload": typeof adminFns_bulkUpload;
  "adminFns/bulkUploadAction": typeof adminFns_bulkUploadAction;
  "adminFns/clients": typeof adminFns_clients;
  "adminFns/dashboard": typeof adminFns_dashboard;
  "adminFns/fullAdvertBanners": typeof adminFns_fullAdvertBanners;
  "adminFns/heroSlides": typeof adminFns_heroSlides;
  "adminFns/homepageSections": typeof adminFns_homepageSections;
  "adminFns/newsletter": typeof adminFns_newsletter;
  "adminFns/prescriptions": typeof adminFns_prescriptions;
  "adminFns/productCategories": typeof adminFns_productCategories;
  "adminFns/products": typeof adminFns_products;
  "adminFns/receipts": typeof adminFns_receipts;
  "adminFns/siteSettings": typeof adminFns_siteSettings;
  auth: typeof auth;
  cdn: typeof cdn;
  cdnCleanup: typeof cdnCleanup;
  cdnCleanupQueries: typeof cdnCleanupQueries;
  crons: typeof crons;
  fileStorage: typeof fileStorage;
  "helpers/paynowHtml": typeof helpers_paynowHtml;
  "helpers/purchaseHelper": typeof helpers_purchaseHelper;
  http: typeof http;
  "paymentFns/paymentActions": typeof paymentFns_paymentActions;
  "paymentFns/paymentTransactions": typeof paymentFns_paymentTransactions;
  "userFns/advertBanners": typeof userFns_advertBanners;
  "userFns/blogPosts": typeof userFns_blogPosts;
  "userFns/branches": typeof userFns_branches;
  "userFns/cart": typeof userFns_cart;
  "userFns/fullAdvertBanners": typeof userFns_fullAdvertBanners;
  "userFns/homepage": typeof userFns_homepage;
  "userFns/newsletter": typeof userFns_newsletter;
  "userFns/orders": typeof userFns_orders;
  "userFns/prescriptions": typeof userFns_prescriptions;
  "userFns/products": typeof userFns_products;
  "userFns/siteSettings": typeof userFns_siteSettings;
  "userFns/userProfile": typeof userFns_userProfile;
  "userFns/wishlist": typeof userFns_wishlist;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
