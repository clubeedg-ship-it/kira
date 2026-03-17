-- CreateEnum
CREATE TYPE "OrganizationStatus" AS ENUM ('active', 'paused', 'archived');

-- CreateEnum
CREATE TYPE "OrganizationRole" AS ENUM ('owner', 'admin', 'editor', 'viewer', 'client');

-- CreateEnum
CREATE TYPE "WebsiteHostType" AS ENUM ('hostnet', 'hostinger', 'generic_sftp', 'local', 'other');

-- CreateEnum
CREATE TYPE "ContentBlockType" AS ENUM ('text', 'rich_text', 'image', 'cta', 'link_list', 'stats');

-- CreateEnum
CREATE TYPE "ContentStatus" AS ENUM ('draft', 'published');

-- CreateEnum
CREATE TYPE "ServiceType" AS ENUM ('website', 'blog', 'ai_support', 'automation', 'crm', 'ads', 'custom');

-- CreateEnum
CREATE TYPE "ServiceStatus" AS ENUM ('setup', 'active', 'warning', 'paused', 'error');

-- CreateEnum
CREATE TYPE "HealthStatus" AS ENUM ('healthy', 'degraded', 'down', 'unknown');

-- CreateEnum
CREATE TYPE "SupportStatus" AS ENUM ('open', 'in_progress', 'resolved', 'closed');

-- CreateEnum
CREATE TYPE "SupportPriority" AS ENUM ('low', 'normal', 'high', 'urgent');

-- CreateEnum
CREATE TYPE "IntegrationType" AS ENUM ('ghost', 'retell', 'webhook', 'analytics', 'custom');

-- CreateEnum
CREATE TYPE "IntegrationStatus" AS ENUM ('connected', 'disconnected', 'pending', 'error');

-- CreateEnum
CREATE TYPE "DeploymentTargetType" AS ENUM ('hostnet', 'hostinger', 'sftp', 'local_fs', 'git');

-- CreateEnum
CREATE TYPE "DeploymentJobType" AS ENUM ('publish', 'verify', 'backup', 'restore', 'test_connection');

-- CreateEnum
CREATE TYPE "DeploymentJobStatus" AS ENUM ('queued', 'running', 'success', 'failed', 'cancelled');

-- CreateEnum
CREATE TYPE "ReleaseStatus" AS ENUM ('draft', 'publishing', 'published', 'failed', 'rolled_back');

-- CreateEnum
CREATE TYPE "ReleaseSourceType" AS ENUM ('config_export', 'static_bundle', 'manual_upload');

-- CreateEnum
CREATE TYPE "BackupKind" AS ENUM ('site_bundle', 'assets', 'config', 'database_export', 'full_snapshot');

-- CreateEnum
CREATE TYPE "BackupStatus" AS ENUM ('creating', 'ready', 'failed', 'restoring', 'restored');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "fullName" TEXT,
    "isPlatformAdmin" BOOLEAN NOT NULL DEFAULT false,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" "OrganizationStatus" NOT NULL DEFAULT 'active',
    "primaryDomain" TEXT,
    "websiteHostType" "WebsiteHostType",
    "appSubdomain" TEXT,
    "blogSubdomain" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationMember" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "OrganizationRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrganizationMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "storageProvider" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "originalFilename" TEXT,
    "mimeType" TEXT,
    "sizeBytes" BIGINT,
    "checksum" TEXT,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrandSettings" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "companyDisplayName" TEXT,
    "logoAssetId" TEXT,
    "faviconAssetId" TEXT,
    "primaryColor" TEXT,
    "secondaryColor" TEXT,
    "accentColor" TEXT,
    "fontHeading" TEXT,
    "fontBody" TEXT,
    "heroTitle" TEXT,
    "heroSubtitle" TEXT,
    "ctaText" TEXT,
    "aboutText" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "addressText" TEXT,
    "socialLinks" JSONB NOT NULL DEFAULT '{}',
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrandSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentBlock" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT,
    "type" "ContentBlockType" NOT NULL,
    "value" JSONB NOT NULL,
    "status" "ContentStatus" NOT NULL DEFAULT 'draft',
    "version" INTEGER NOT NULL DEFAULT 1,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Service" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ServiceType" NOT NULL,
    "status" "ServiceStatus" NOT NULL,
    "description" TEXT,
    "externalUrl" TEXT,
    "healthStatus" "HealthStatus" NOT NULL DEFAULT 'unknown',
    "lastCheckedAt" TIMESTAMP(3),
    "lastUpdatedAt" TIMESTAMP(3),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityEvent" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "source" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportRequest" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdByUserId" TEXT,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" "SupportStatus" NOT NULL DEFAULT 'open',
    "priority" "SupportPriority" NOT NULL DEFAULT 'normal',
    "channel" TEXT,
    "assignedToUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "SupportRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntegrationConnection" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "type" "IntegrationType" NOT NULL,
    "name" TEXT NOT NULL,
    "status" "IntegrationStatus" NOT NULL DEFAULT 'disconnected',
    "config" JSONB NOT NULL DEFAULT '{}',
    "lastTestedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntegrationConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntegrationSecret" (
    "id" TEXT NOT NULL,
    "integrationConnectionId" TEXT NOT NULL,
    "secretKey" TEXT NOT NULL,
    "encryptedValue" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntegrationSecret_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeploymentTarget" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "targetType" "DeploymentTargetType" NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "config" JSONB NOT NULL DEFAULT '{}',
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeploymentTarget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeploymentTargetSecret" (
    "id" TEXT NOT NULL,
    "deploymentTargetId" TEXT NOT NULL,
    "secretKey" TEXT NOT NULL,
    "encryptedValue" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeploymentTargetSecret_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteRelease" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "deploymentTargetId" TEXT,
    "releaseVersion" INTEGER NOT NULL,
    "status" "ReleaseStatus" NOT NULL,
    "sourceType" "ReleaseSourceType" NOT NULL,
    "artifactAssetId" TEXT,
    "checksum" TEXT,
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "SiteRelease_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeploymentJob" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "deploymentTargetId" TEXT,
    "siteReleaseId" TEXT,
    "jobType" "DeploymentJobType" NOT NULL,
    "status" "DeploymentJobStatus" NOT NULL DEFAULT 'queued',
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "logExcerpt" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeploymentJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Backup" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "kind" "BackupKind" NOT NULL,
    "status" "BackupStatus" NOT NULL,
    "storageAssetId" TEXT,
    "sourceReleaseId" TEXT,
    "checksum" TEXT,
    "sizeBytes" BIGINT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "restoredAt" TIMESTAMP(3),

    CONSTRAINT "Backup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "actorUserId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HealthCheck" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT,
    "status" "HealthStatus" NOT NULL,
    "responseTimeMs" INTEGER,
    "statusCode" INTEGER,
    "summary" TEXT,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HealthCheck_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

-- CreateIndex
CREATE INDEX "OrganizationMember_userId_idx" ON "OrganizationMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationMember_organizationId_userId_key" ON "OrganizationMember"("organizationId", "userId");

-- CreateIndex
CREATE INDEX "Asset_organizationId_idx" ON "Asset"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "BrandSettings_organizationId_key" ON "BrandSettings"("organizationId");

-- CreateIndex
CREATE INDEX "ContentBlock_organizationId_status_idx" ON "ContentBlock"("organizationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ContentBlock_organizationId_key_key" ON "ContentBlock"("organizationId", "key");

-- CreateIndex
CREATE INDEX "Service_organizationId_idx" ON "Service"("organizationId");

-- CreateIndex
CREATE INDEX "Service_organizationId_status_idx" ON "Service"("organizationId", "status");

-- CreateIndex
CREATE INDEX "ActivityEvent_organizationId_createdAt_idx" ON "ActivityEvent"("organizationId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "SupportRequest_organizationId_status_idx" ON "SupportRequest"("organizationId", "status");

-- CreateIndex
CREATE INDEX "SupportRequest_organizationId_createdAt_idx" ON "SupportRequest"("organizationId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "IntegrationConnection_organizationId_type_idx" ON "IntegrationConnection"("organizationId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationSecret_integrationConnectionId_secretKey_key" ON "IntegrationSecret"("integrationConnectionId", "secretKey");

-- CreateIndex
CREATE INDEX "DeploymentTarget_organizationId_idx" ON "DeploymentTarget"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "DeploymentTargetSecret_deploymentTargetId_secretKey_key" ON "DeploymentTargetSecret"("deploymentTargetId", "secretKey");

-- CreateIndex
CREATE INDEX "SiteRelease_organizationId_createdAt_idx" ON "SiteRelease"("organizationId", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "SiteRelease_organizationId_releaseVersion_key" ON "SiteRelease"("organizationId", "releaseVersion");

-- CreateIndex
CREATE INDEX "DeploymentJob_organizationId_status_idx" ON "DeploymentJob"("organizationId", "status");

-- CreateIndex
CREATE INDEX "DeploymentJob_organizationId_createdAt_idx" ON "DeploymentJob"("organizationId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Backup_organizationId_createdAt_idx" ON "Backup"("organizationId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "AuditLog_organizationId_createdAt_idx" ON "AuditLog"("organizationId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "HealthCheck_organizationId_checkedAt_idx" ON "HealthCheck"("organizationId", "checkedAt" DESC);

-- AddForeignKey
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandSettings" ADD CONSTRAINT "BrandSettings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandSettings" ADD CONSTRAINT "BrandSettings_logoAssetId_fkey" FOREIGN KEY ("logoAssetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandSettings" ADD CONSTRAINT "BrandSettings_faviconAssetId_fkey" FOREIGN KEY ("faviconAssetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandSettings" ADD CONSTRAINT "BrandSettings_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentBlock" ADD CONSTRAINT "ContentBlock_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentBlock" ADD CONSTRAINT "ContentBlock_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityEvent" ADD CONSTRAINT "ActivityEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityEvent" ADD CONSTRAINT "ActivityEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportRequest" ADD CONSTRAINT "SupportRequest_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportRequest" ADD CONSTRAINT "SupportRequest_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportRequest" ADD CONSTRAINT "SupportRequest_assignedToUserId_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntegrationConnection" ADD CONSTRAINT "IntegrationConnection_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntegrationSecret" ADD CONSTRAINT "IntegrationSecret_integrationConnectionId_fkey" FOREIGN KEY ("integrationConnectionId") REFERENCES "IntegrationConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeploymentTarget" ADD CONSTRAINT "DeploymentTarget_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeploymentTargetSecret" ADD CONSTRAINT "DeploymentTargetSecret_deploymentTargetId_fkey" FOREIGN KEY ("deploymentTargetId") REFERENCES "DeploymentTarget"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteRelease" ADD CONSTRAINT "SiteRelease_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteRelease" ADD CONSTRAINT "SiteRelease_deploymentTargetId_fkey" FOREIGN KEY ("deploymentTargetId") REFERENCES "DeploymentTarget"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteRelease" ADD CONSTRAINT "SiteRelease_artifactAssetId_fkey" FOREIGN KEY ("artifactAssetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteRelease" ADD CONSTRAINT "SiteRelease_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeploymentJob" ADD CONSTRAINT "DeploymentJob_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeploymentJob" ADD CONSTRAINT "DeploymentJob_deploymentTargetId_fkey" FOREIGN KEY ("deploymentTargetId") REFERENCES "DeploymentTarget"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeploymentJob" ADD CONSTRAINT "DeploymentJob_siteReleaseId_fkey" FOREIGN KEY ("siteReleaseId") REFERENCES "SiteRelease"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Backup" ADD CONSTRAINT "Backup_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Backup" ADD CONSTRAINT "Backup_storageAssetId_fkey" FOREIGN KEY ("storageAssetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Backup" ADD CONSTRAINT "Backup_sourceReleaseId_fkey" FOREIGN KEY ("sourceReleaseId") REFERENCES "SiteRelease"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Backup" ADD CONSTRAINT "Backup_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealthCheck" ADD CONSTRAINT "HealthCheck_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
