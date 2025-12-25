-- CreateEnum
CREATE TYPE "PowerMode" AS ENUM ('NORMAL', 'LOW');

-- CreateEnum
CREATE TYPE "TextSize" AS ENUM ('SMALL', 'NORMAL', 'LARGE');

-- CreateEnum
CREATE TYPE "KeyboardType" AS ENUM ('QWERTY', 'T9');

-- CreateEnum
CREATE TYPE "SenderType" AS ENUM ('DEVICE', 'WEB');

-- CreateEnum
CREATE TYPE "OTAStatus" AS ENUM ('PENDING', 'DOWNLOADING', 'SUCCESS', 'FAILED', 'ROLLED_BACK');

-- CreateEnum
CREATE TYPE "AIProvider" AS ENUM ('OPENAI', 'ANTHROPIC', 'GEMINI', 'DEEPSEEK', 'PERPLEXITY', 'GROQ', 'OPENROUTER');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "devices" (
    "id" TEXT NOT NULL,
    "device_id" TEXT NOT NULL,
    "owner_id" TEXT,
    "mac_address" TEXT NOT NULL,
    "firmware_version" TEXT NOT NULL DEFAULT '1.0.0',
    "last_seen" TIMESTAMP(3),
    "online" BOOLEAN NOT NULL DEFAULT false,
    "battery_percent" INTEGER NOT NULL DEFAULT 100,
    "power_mode" "PowerMode" NOT NULL DEFAULT 'NORMAL',
    "text_size" "TextSize" NOT NULL DEFAULT 'NORMAL',
    "keyboard" "KeyboardType" NOT NULL DEFAULT 'QWERTY',
    "screen_timeout" INTEGER NOT NULL DEFAULT 30,
    "device_token" TEXT,
    "token_revoked" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bind_codes" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "device_id" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bind_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_messages" (
    "id" TEXT NOT NULL,
    "device_id" TEXT NOT NULL,
    "sender" "SenderType" NOT NULL,
    "content" VARCHAR(2500) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "files" (
    "id" TEXT NOT NULL,
    "device_id" TEXT NOT NULL,
    "content" VARCHAR(4000) NOT NULL,
    "char_count" INTEGER NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_configs" (
    "id" TEXT NOT NULL,
    "device_id" TEXT NOT NULL,
    "provider" "AIProvider" NOT NULL DEFAULT 'OPENAI',
    "model" TEXT NOT NULL DEFAULT 'gpt-4o-mini',
    "max_chars" INTEGER NOT NULL DEFAULT 2500,
    "temperature" DOUBLE PRECISION NOT NULL DEFAULT 0.3,
    "api_key" TEXT,

    CONSTRAINT "ai_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "firmware" (
    "id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "storage_path" TEXT NOT NULL,
    "checksum" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "firmware_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_logs" (
    "id" TEXT NOT NULL,
    "device_id" TEXT NOT NULL,
    "last_ai_query" TIMESTAMP(3),
    "last_file_sync" TIMESTAMP(3),
    "last_chat_message" TIMESTAMP(3),

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ota_jobs" (
    "id" TEXT NOT NULL,
    "device_id" TEXT NOT NULL,
    "firmware_id" TEXT NOT NULL,
    "status" "OTAStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ota_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_chunks" (
    "id" TEXT NOT NULL,
    "query_id" TEXT NOT NULL,
    "device_id" TEXT NOT NULL,
    "chunks" TEXT[],
    "cursor" INTEGER NOT NULL DEFAULT 0,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_chunks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "devices_device_id_key" ON "devices"("device_id");

-- CreateIndex
CREATE UNIQUE INDEX "bind_codes_code_key" ON "bind_codes"("code");

-- CreateIndex
CREATE INDEX "bind_codes_code_expires_at_idx" ON "bind_codes"("code", "expires_at");

-- CreateIndex
CREATE INDEX "chat_messages_device_id_created_at_idx" ON "chat_messages"("device_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "files_device_id_key" ON "files"("device_id");

-- CreateIndex
CREATE UNIQUE INDEX "ai_configs_device_id_key" ON "ai_configs"("device_id");

-- CreateIndex
CREATE UNIQUE INDEX "firmware_version_key" ON "firmware"("version");

-- CreateIndex
CREATE UNIQUE INDEX "activity_logs_device_id_key" ON "activity_logs"("device_id");

-- CreateIndex
CREATE INDEX "ota_jobs_device_id_status_idx" ON "ota_jobs"("device_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ai_chunks_query_id_key" ON "ai_chunks"("query_id");

-- CreateIndex
CREATE INDEX "ai_chunks_query_id_idx" ON "ai_chunks"("query_id");

-- CreateIndex
CREATE INDEX "ai_chunks_expires_at_idx" ON "ai_chunks"("expires_at");

-- AddForeignKey
ALTER TABLE "devices" ADD CONSTRAINT "devices_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bind_codes" ADD CONSTRAINT "bind_codes_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "files" ADD CONSTRAINT "files_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_configs" ADD CONSTRAINT "ai_configs_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ota_jobs" ADD CONSTRAINT "ota_jobs_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ota_jobs" ADD CONSTRAINT "ota_jobs_firmware_id_fkey" FOREIGN KEY ("firmware_id") REFERENCES "firmware"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
