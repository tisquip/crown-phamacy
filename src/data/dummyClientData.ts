import { products } from "./products";

export interface Staff {
  _id: string;
  _creationTime: number;
  fullname: string;
  email: string;
}

export interface Client {
  _id: string;
  _creationTime: number;
  firstName: string;
  Middlename?: string;
  lastName: string;
  phoneNumber: string;
  email?: string;
  primaryAddress?: string;
  otherAddresses: string[];
}

export interface DummyOrder {
  _id: string;
  _creationTime: number;
  clientId: string;
  productIds: string[];
  productsAsJsonOnDateOfPurchase: string;
  uploadedPrescriptionId: string;
  staffId: string;
  address?: string;
}

export interface UploadedPrescription {
  _id: string;
  _creationTime: number;
  storageId: string;
  clientId: string;
  status: "Uploaded" | "Quotation Sent" | "Purchased" | "Cancelled";
}

export interface Wishlist {
  _id: string;
  _creationTime: number;
  clientId: string;
  productIds: string[];
}

// Dummy staff
export const staff: Staff[] = [
  {
    _id: "staff1",
    _creationTime: Date.now(),
    fullname: "Dr. Tendai Moyo",
    email: "tendai@crownpharmacy.co.zw",
  },
  {
    _id: "staff2",
    _creationTime: Date.now(),
    fullname: "Pharmacist Rudo Chikwanha",
    email: "rudo@crownpharmacy.co.zw",
  },
];

// Dummy client (the logged-in user)
export const dummyClient: Client = {
  _id: "client1",
  _creationTime: Date.now() - 90 * 24 * 60 * 60 * 1000,
  firstName: "Tatenda",
  lastName: "Mukasa",
  phoneNumber: "+263782244007",
  email: "tatenda@example.com",
  primaryAddress: "12 Samora Machel Ave, Harare",
  otherAddresses: ["45 Second Street, Harare"],
};

// Helper: build purchase receipt products JSON
const buildPurchaseJson = (productIds: string[]) => {
  const purchaseProducts = productIds
    .map((id) => {
      const p = products.find((pr) => pr._id === id);
      return p ? { ...p } : null;
    })
    .filter(Boolean);
  return JSON.stringify(purchaseProducts);
};

// Dummy orders (client has purchased some medicines and regular products)
export const dummyOrders: DummyOrder[] = [
  {
    _id: "pr1",
    _creationTime: Date.now() - 60 * 24 * 60 * 60 * 1000, // 60 days ago
    clientId: "client1",
    productIds: ["1", "2", "26", "28"],
    productsAsJsonOnDateOfPurchase: buildPurchaseJson(["1", "2", "26", "28"]),
    uploadedPrescriptionId: "",
    staffId: "staff1",
    address: "12 Samora Machel Ave, Harare",
  },
  {
    _id: "pr2",
    _creationTime: Date.now() - 30 * 24 * 60 * 60 * 1000, // 30 days ago
    clientId: "client1",
    productIds: ["5", "14", "25", "27", "30"],
    productsAsJsonOnDateOfPurchase: buildPurchaseJson([
      "5",
      "14",
      "25",
      "27",
      "30",
    ]),
    uploadedPrescriptionId: "up1",
    staffId: "staff2",
    address: "12 Samora Machel Ave, Harare",
  },
  {
    _id: "pr3",
    _creationTime: Date.now() - 7 * 24 * 60 * 60 * 1000, // 7 days ago
    clientId: "client1",
    productIds: ["9", "21", "28", "29"],
    productsAsJsonOnDateOfPurchase: buildPurchaseJson(["9", "21", "28", "29"]),
    uploadedPrescriptionId: "up2",
    staffId: "staff1",
  },
];

// Dummy uploaded prescriptions
export const uploadedPrescriptions: UploadedPrescription[] = [
  {
    _id: "up1",
    _creationTime: Date.now() - 31 * 24 * 60 * 60 * 1000,
    storageId: "storage_abc",
    clientId: "client1",
    status: "Purchased",
  },
  {
    _id: "up2",
    _creationTime: Date.now() - 8 * 24 * 60 * 60 * 1000,
    storageId: "storage_def",
    clientId: "client1",
    status: "Purchased",
  },
  {
    _id: "up3",
    _creationTime: Date.now() - 2 * 24 * 60 * 60 * 1000,
    storageId: "storage_ghi",
    clientId: "client1",
    status: "Uploaded",
  },
  {
    _id: "up4",
    _creationTime: Date.now() - 15 * 24 * 60 * 60 * 1000,
    storageId: "storage_jkl",
    clientId: "client1",
    status: "Quotation Sent",
  },
];

// Dummy wishlist
export const dummyWishlist: Wishlist = {
  _id: "wl1",
  _creationTime: Date.now(),
  clientId: "client1",
  productIds: ["2", "9", "15", "21"],
};

// Helper functions
export const getClientPurchaseReceipts = (clientId: string) =>
  dummyOrders.filter((r) => r.clientId === clientId);

export const getClientPrescriptions = (clientId: string) =>
  uploadedPrescriptions.filter((p) => p.clientId === clientId);

export const getReceiptsForPrescription = (prescriptionId: string) =>
  dummyOrders.filter((r) => r.uploadedPrescriptionId === prescriptionId);

/** All unique product IDs ever purchased by a client */
export const getClientPurchasedProductIds = (clientId: string): string[] => {
  const receipts = getClientPurchaseReceipts(clientId);
  const ids = new Set<string>();
  receipts.forEach((r) => r.productIds.forEach((id) => ids.add(id)));
  return Array.from(ids);
};

/** Get the last purchase date for a specific product by a client */
export const getLastPurchaseDate = (
  clientId: string,
  productId: string,
): Date | null => {
  const receipts = getClientPurchaseReceipts(clientId)
    .filter((r) => r.productIds.includes(productId))
    .sort((a, b) => b._creationTime - a._creationTime);
  return receipts.length > 0 ? new Date(receipts[0]._creationTime) : null;
};
