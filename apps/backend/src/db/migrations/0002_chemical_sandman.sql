ALTER TABLE "products" ADD COLUMN "barcode" varchar(100) NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "cost_price" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "critical_stock" integer;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "image_key" varchar(500);--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_barcode_unique" UNIQUE("barcode");