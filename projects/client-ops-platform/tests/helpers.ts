import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

export async function resetDb() {
  const tablenames = [
    '"AuditLog"',
    '"HealthCheck"',
    '"Backup"',
    '"DeploymentJob"',
    '"SiteRelease"',
    '"DeploymentTargetSecret"',
    '"DeploymentTarget"',
    '"IntegrationSecret"',
    '"IntegrationConnection"',
    '"SupportRequest"',
    '"ActivityEvent"',
    '"Service"',
    '"ContentBlock"',
    '"BrandSettings"',
    '"Asset"',
    '"OrganizationMember"',
    '"Organization"',
    '"User"'
  ];

  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tablenames.join(', ')} RESTART IDENTITY CASCADE;`);
}

export async function disconnectDb() {
  await prisma.$disconnect();
}

export async function createUser(email: string, isPlatformAdmin = false) {
  return prisma.user.create({
    data: {
      email,
      fullName: email.split('@')[0],
      isPlatformAdmin,
      passwordHash: 'test-hash',
    },
  });
}

export async function createOrganization(slug: string) {
  return prisma.organization.create({
    data: {
      name: slug,
      slug,
    },
  });
}
