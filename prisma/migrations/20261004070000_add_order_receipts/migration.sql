-- CreateTable
CREATE TABLE "order_receipts" (
    "id" TEXT NOT NULL,
    "order_id" TEXT,
    "filename" VARCHAR(255) NOT NULL,
    "storage_path" VARCHAR(255),
    "mime_type" VARCHAR(100) NOT NULL,
    "size" INTEGER NOT NULL,
    "sha256" VARCHAR(64) NOT NULL,
    "data" BYTEA NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "order_receipts_order_id_idx" ON "order_receipts"("order_id");

-- CreateIndex
CREATE INDEX "order_receipts_sha256_idx" ON "order_receipts"("sha256");

-- CreateIndex
CREATE INDEX "order_receipts_storage_path_idx" ON "order_receipts"("storage_path");

-- AddForeignKey
ALTER TABLE "order_receipts" ADD CONSTRAINT "order_receipts_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;