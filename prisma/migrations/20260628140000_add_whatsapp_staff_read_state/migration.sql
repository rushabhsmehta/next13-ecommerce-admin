-- CreateTable
CREATE TABLE "WhatsAppStaffReadState" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "lastReadAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppStaffReadState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WhatsAppStaffReadState_userId_idx" ON "WhatsAppStaffReadState"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppStaffReadState_userId_phone_key" ON "WhatsAppStaffReadState"("userId", "phone");
