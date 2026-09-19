-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'CLIENT';

-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "assigned_seller_id" TEXT,
ADD COLUMN     "user_id" TEXT;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "client_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "customers_user_id_key" ON "customers"("user_id");

-- CreateIndex
CREATE INDEX "customers_assigned_seller_id_idx" ON "customers"("assigned_seller_id");

-- CreateIndex
CREATE INDEX "orders_client_id_idx" ON "orders"("client_id");

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_assigned_seller_id_fkey" FOREIGN KEY ("assigned_seller_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
