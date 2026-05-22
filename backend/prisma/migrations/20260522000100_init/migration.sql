-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('active', 'suspended', 'pending', 'deleted');

-- CreateEnum
CREATE TYPE "HostingAccountStatus" AS ENUM ('active', 'suspended', 'pending', 'deleted');

-- CreateEnum
CREATE TYPE "DomainType" AS ENUM ('primary', 'addon', 'parked', 'subdomain');

-- CreateEnum
CREATE TYPE "DatabaseType" AS ENUM ('mysql', 'postgresql');

-- CreateEnum
CREATE TYPE "EmailAccountStatus" AS ENUM ('active', 'disabled', 'suspended');

-- CreateEnum
CREATE TYPE "SslCertificateType" AS ENUM ('letsencrypt', 'custom', 'selfsigned');

-- CreateEnum
CREATE TYPE "SslCertificateStatus" AS ENUM ('active', 'expired', 'pending', 'revoked');

-- CreateEnum
CREATE TYPE "BackupType" AS ENUM ('full', 'files', 'databases', 'email', 'dns');

-- CreateEnum
CREATE TYPE "BackupStatus" AS ENUM ('pending', 'running', 'success', 'failed', 'restored');

-- CreateEnum
CREATE TYPE "BackupFrequency" AS ENUM ('daily', 'weekly', 'monthly');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('queued', 'running', 'success', 'failed', 'cancelled');

-- CreateEnum
CREATE TYPE "ServiceStatus" AS ENUM ('running', 'stopped', 'degraded', 'unknown');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('info', 'success', 'warning', 'error');

-- CreateEnum
CREATE TYPE "SecuritySeverity" AS ENUM ('low', 'medium', 'high', 'critical');

-- CreateEnum
CREATE TYPE "FileEntryType" AS ENUM ('file', 'folder', 'symlink');

-- CreateEnum
CREATE TYPE "DnsRecordType" AS ENUM ('A', 'AAAA', 'CNAME', 'MX', 'TXT', 'SRV', 'CAA', 'NS', 'PTR');

-- CreateTable
CREATE TABLE "Role" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "permissions" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "roleId" UUID NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'active',
    "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "twoFactorSecret" TEXT,
    "locale" TEXT NOT NULL DEFAULT 'en',
    "theme" TEXT NOT NULL DEFAULT 'dark',
    "lastLoginAt" TIMESTAMP(3),
    "tokenVersion" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResellerProfile" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "maxAccounts" INTEGER NOT NULL DEFAULT 0,
    "allowedPackages" JSONB NOT NULL,
    "privileges" JSONB NOT NULL,
    "nameservers" JSONB NOT NULL,
    "sharedIp" TEXT,
    "dedicatedIps" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResellerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Package" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "diskLimit" INTEGER NOT NULL,
    "bandwidthLimit" INTEGER NOT NULL,
    "maxDomains" INTEGER NOT NULL,
    "maxSubdomains" INTEGER NOT NULL,
    "maxParkedDomains" INTEGER NOT NULL,
    "maxAddonDomains" INTEGER NOT NULL,
    "maxEmailAccounts" INTEGER NOT NULL,
    "maxDatabases" INTEGER NOT NULL,
    "maxFtpAccounts" INTEGER NOT NULL,
    "maxCronJobs" INTEGER NOT NULL,
    "maxApiTokens" INTEGER NOT NULL,
    "maxInodes" INTEGER NOT NULL,
    "featureSet" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Package_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HostingAccount" (
    "id" UUID NOT NULL,
    "ownerUserId" UUID NOT NULL,
    "resellerProfileId" UUID,
    "username" TEXT NOT NULL,
    "primaryDomain" TEXT NOT NULL,
    "packageId" UUID NOT NULL,
    "status" "HostingAccountStatus" NOT NULL DEFAULT 'pending',
    "homeDirectory" TEXT NOT NULL,
    "uid" INTEGER,
    "gid" INTEGER,
    "diskUsed" INTEGER NOT NULL DEFAULT 0,
    "diskLimit" INTEGER NOT NULL DEFAULT 0,
    "bandwidthUsed" INTEGER NOT NULL DEFAULT 0,
    "bandwidthLimit" INTEGER NOT NULL DEFAULT 0,
    "inodeUsed" INTEGER NOT NULL DEFAULT 0,
    "inodeLimit" INTEGER NOT NULL DEFAULT 0,
    "ipAddress" TEXT,
    "phpVersion" TEXT DEFAULT '8.3',
    "suspendedAt" TIMESTAMP(3),
    "suspensionReason" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HostingAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Domain" (
    "id" UUID NOT NULL,
    "accountId" UUID NOT NULL,
    "domain" TEXT NOT NULL,
    "type" "DomainType" NOT NULL,
    "documentRoot" TEXT NOT NULL,
    "sslEnabled" BOOLEAN NOT NULL DEFAULT false,
    "forceHttps" BOOLEAN NOT NULL DEFAULT false,
    "phpVersion" TEXT DEFAULT '8.3',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Domain_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DnsZone" (
    "id" UUID NOT NULL,
    "domainId" UUID NOT NULL,
    "zoneName" TEXT NOT NULL,
    "serial" INTEGER NOT NULL DEFAULT 1,
    "records" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DnsZone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DnsRecord" (
    "id" UUID NOT NULL,
    "zoneId" UUID NOT NULL,
    "type" "DnsRecordType" NOT NULL,
    "name" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "priority" INTEGER,
    "ttl" INTEGER NOT NULL DEFAULT 3600,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DnsRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailAccount" (
    "id" UUID NOT NULL,
    "accountId" UUID NOT NULL,
    "domainId" UUID NOT NULL,
    "localPart" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "quotaMb" INTEGER NOT NULL DEFAULT 0,
    "usedMb" INTEGER NOT NULL DEFAULT 0,
    "status" "EmailAccountStatus" NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailForwarder" (
    "id" UUID NOT NULL,
    "accountId" UUID NOT NULL,
    "source" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailForwarder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Autoresponder" (
    "id" UUID NOT NULL,
    "emailAccountId" UUID NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Autoresponder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Database" (
    "id" UUID NOT NULL,
    "accountId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" "DatabaseType" NOT NULL DEFAULT 'mysql',
    "sizeMb" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Database_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DatabaseUser" (
    "id" UUID NOT NULL,
    "accountId" UUID NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "privileges" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DatabaseUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FtpAccount" (
    "id" UUID NOT NULL,
    "accountId" UUID NOT NULL,
    "username" TEXT NOT NULL,
    "homeDirectory" TEXT NOT NULL,
    "quotaMb" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FtpAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SslCertificate" (
    "id" UUID NOT NULL,
    "domainId" UUID NOT NULL,
    "issuer" TEXT NOT NULL,
    "type" "SslCertificateType" NOT NULL DEFAULT 'letsencrypt',
    "certificatePath" TEXT NOT NULL,
    "privateKeyPath" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "autoRenew" BOOLEAN NOT NULL DEFAULT false,
    "status" "SslCertificateStatus" NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SslCertificate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BackupJob" (
    "id" UUID NOT NULL,
    "accountId" UUID NOT NULL,
    "type" "BackupType" NOT NULL,
    "status" "BackupStatus" NOT NULL DEFAULT 'pending',
    "storagePath" TEXT NOT NULL,
    "sizeMb" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BackupJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BackupSchedule" (
    "id" UUID NOT NULL,
    "accountId" UUID NOT NULL,
    "frequency" "BackupFrequency" NOT NULL,
    "retention" INTEGER NOT NULL,
    "destination" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BackupSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CronJob" (
    "id" UUID NOT NULL,
    "accountId" UUID NOT NULL,
    "command" TEXT NOT NULL,
    "schedule" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CronJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FileEntry" (
    "id" UUID NOT NULL,
    "accountId" UUID NOT NULL,
    "path" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "FileEntryType" NOT NULL,
    "sizeBytes" INTEGER NOT NULL DEFAULT 0,
    "permissions" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FileEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServerService" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "status" "ServiceStatus" NOT NULL DEFAULT 'unknown',
    "port" INTEGER,
    "version" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastCheckedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServerService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServerMetric" (
    "id" UUID NOT NULL,
    "cpuUsage" DOUBLE PRECISION NOT NULL,
    "memoryUsage" DOUBLE PRECISION NOT NULL,
    "diskUsage" DOUBLE PRECISION NOT NULL,
    "loadAverage" DOUBLE PRECISION NOT NULL,
    "networkIn" DOUBLE PRECISION NOT NULL,
    "networkOut" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServerMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SecurityEvent" (
    "id" UUID NOT NULL,
    "severity" "SecuritySeverity" NOT NULL,
    "source" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SecurityEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiToken" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "scopes" JSONB NOT NULL,
    "lastUsedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApiToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" UUID NOT NULL,
    "actorUserId" UUID,
    "action" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "metadata" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "status" "TaskStatus" NOT NULL DEFAULT 'queued',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "payload" JSONB NOT NULL,
    "result" JSONB,
    "error" TEXT,
    "createdByUserId" UUID,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Settings" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_key_key" ON "Permission"("key");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "ResellerProfile_userId_key" ON "ResellerProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Package_name_key" ON "Package"("name");

-- CreateIndex
CREATE UNIQUE INDEX "HostingAccount_username_key" ON "HostingAccount"("username");

-- CreateIndex
CREATE UNIQUE INDEX "HostingAccount_primaryDomain_key" ON "HostingAccount"("primaryDomain");

-- CreateIndex
CREATE UNIQUE INDEX "Domain_domain_key" ON "Domain"("domain");

-- CreateIndex
CREATE UNIQUE INDEX "DnsZone_domainId_key" ON "DnsZone"("domainId");

-- CreateIndex
CREATE UNIQUE INDEX "EmailAccount_email_key" ON "EmailAccount"("email");

-- CreateIndex
CREATE UNIQUE INDEX "EmailAccount_domainId_localPart_key" ON "EmailAccount"("domainId", "localPart");

-- CreateIndex
CREATE UNIQUE INDEX "Database_accountId_name_key" ON "Database"("accountId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "DatabaseUser_accountId_username_key" ON "DatabaseUser"("accountId", "username");

-- CreateIndex
CREATE UNIQUE INDEX "FtpAccount_accountId_username_key" ON "FtpAccount"("accountId", "username");

-- CreateIndex
CREATE UNIQUE INDEX "SslCertificate_domainId_type_key" ON "SslCertificate"("domainId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "FileEntry_accountId_path_key" ON "FileEntry"("accountId", "path");

-- CreateIndex
CREATE UNIQUE INDEX "ServerService_name_key" ON "ServerService"("name");

-- CreateIndex
CREATE INDEX "ServerMetric_createdAt_idx" ON "ServerMetric"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ApiToken_tokenHash_key" ON "ApiToken"("tokenHash");

-- CreateIndex
CREATE INDEX "AuditLog_resourceType_resourceId_idx" ON "AuditLog"("resourceType", "resourceId");

-- CreateIndex
CREATE UNIQUE INDEX "Settings_key_key" ON "Settings"("key");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResellerProfile" ADD CONSTRAINT "ResellerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HostingAccount" ADD CONSTRAINT "HostingAccount_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HostingAccount" ADD CONSTRAINT "HostingAccount_resellerProfileId_fkey" FOREIGN KEY ("resellerProfileId") REFERENCES "ResellerProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HostingAccount" ADD CONSTRAINT "HostingAccount_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "Package"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Domain" ADD CONSTRAINT "Domain_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "HostingAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DnsZone" ADD CONSTRAINT "DnsZone_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES "Domain"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DnsRecord" ADD CONSTRAINT "DnsRecord_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "DnsZone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailAccount" ADD CONSTRAINT "EmailAccount_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "HostingAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailAccount" ADD CONSTRAINT "EmailAccount_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES "Domain"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailForwarder" ADD CONSTRAINT "EmailForwarder_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "HostingAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Autoresponder" ADD CONSTRAINT "Autoresponder_emailAccountId_fkey" FOREIGN KEY ("emailAccountId") REFERENCES "EmailAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Database" ADD CONSTRAINT "Database_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "HostingAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DatabaseUser" ADD CONSTRAINT "DatabaseUser_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "HostingAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FtpAccount" ADD CONSTRAINT "FtpAccount_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "HostingAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SslCertificate" ADD CONSTRAINT "SslCertificate_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES "Domain"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BackupJob" ADD CONSTRAINT "BackupJob_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "HostingAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BackupSchedule" ADD CONSTRAINT "BackupSchedule_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "HostingAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CronJob" ADD CONSTRAINT "CronJob_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "HostingAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileEntry" ADD CONSTRAINT "FileEntry_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "HostingAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiToken" ADD CONSTRAINT "ApiToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

