import {
  boolean,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

// ── Enums ────────────────────────────────────────────────────────────────────

export const userRoleEnum = pgEnum("user_role", ["admin", "seller"]);
export const paymentMethodEnum = pgEnum("payment_method", ["cash", "card", "transfer"]);

// ── Helpers ──────────────────────────────────────────────────────────────────

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

// ── users ────────────────────────────────────────────────────────────────────

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 255 }).notNull(),
    email: varchar("email", { length: 255 }).notNull().unique(), // unique() already creates an index
    passwordHash: varchar("password_hash", { length: 255 }).notNull(),
    role: userRoleEnum("role").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    ...timestamps,
  },
  (table) => [index("users_is_active_idx").on(table.isActive)],
);

// ── sessions (auth — refresh token store) ────────────────────────────────────

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(), // unique() already creates an index
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ...timestamps,
  },
  (table) => [index("sessions_user_id_idx").on(table.userId)],
);

// ── products ─────────────────────────────────────────────────────────────────

export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 255 }).notNull(),
    price: numeric("price", { precision: 10, scale: 2 }).notNull(),
    stock: integer("stock").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    ...timestamps,
  },
  (table) => [index("products_is_active_idx").on(table.isActive)],
);

// ── sales ─────────────────────────────────────────────────────────────────────

export const sales = pgTable(
  "sales",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    totalAmount: numeric("total_amount", { precision: 12, scale: 2 }).notNull(),
    paymentMethod: paymentMethodEnum("payment_method").notNull(),
    sellerId: uuid("seller_id")
      .notNull()
      .references(() => users.id),
    isActive: boolean("is_active").notNull().default(true),
    ...timestamps,
  },
  (table) => [
    index("sales_is_active_idx").on(table.isActive),
    index("sales_payment_method_idx").on(table.paymentMethod),
    index("sales_seller_id_idx").on(table.sellerId),
    // Reporting indexes
    index("sales_created_at_idx").on(table.createdAt),
    index("sales_seller_id_created_at_idx").on(table.sellerId, table.createdAt),
    index("sales_payment_method_created_at_idx").on(table.paymentMethod, table.createdAt),
  ],
);

// ── sale_details ──────────────────────────────────────────────────────────────

export const saleDetails = pgTable(
  "sale_details",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    saleId: uuid("sale_id")
      .notNull()
      .references(() => sales.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),
    quantity: integer("quantity").notNull(),
    unitPrice: numeric("unit_price", { precision: 10, scale: 2 }).notNull(),
    ...timestamps,
  },
  (table) => [
    index("sale_details_sale_id_idx").on(table.saleId),
    index("sale_details_product_id_idx").on(table.productId),
  ],
);

// ── inventory_receipts ────────────────────────────────────────────────────────

export const inventoryReceipts = pgTable(
  "inventory_receipts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    notes: text("notes"),
    receivedById: uuid("received_by_id")
      .notNull()
      .references(() => users.id),
    isActive: boolean("is_active").notNull().default(true),
    ...timestamps,
  },
  (table) => [
    index("inventory_receipts_is_active_idx").on(table.isActive),
    index("inventory_receipts_received_by_id_idx").on(table.receivedById),
  ],
);

// ── inventory_receipt_details ─────────────────────────────────────────────────

export const inventoryReceiptDetails = pgTable(
  "inventory_receipt_details",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    receiptId: uuid("receipt_id")
      .notNull()
      .references(() => inventoryReceipts.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),
    quantity: integer("quantity").notNull(),
    ...timestamps,
  },
  (table) => [
    index("inventory_receipt_details_receipt_id_idx").on(table.receiptId),
    index("inventory_receipt_details_product_id_idx").on(table.productId),
  ],
);

// ── system_logs ───────────────────────────────────────────────────────────────

export const systemLogs = pgTable(
  "system_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    note: text("note").notNull(),
    ...timestamps,
  },
  (table) => [index("system_logs_user_id_idx").on(table.userId)],
);
