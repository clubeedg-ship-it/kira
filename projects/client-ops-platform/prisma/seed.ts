import { PrismaClient, ContentBlockType, ContentStatus, HealthStatus, OrganizationRole, OrganizationStatus, ServiceStatus, ServiceType, WebsiteHostType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const admin = await prisma.user.upsert({
    where: { email: 'admin@clientops.local' },
    update: {
      fullName: 'Platform Admin',
      isPlatformAdmin: true,
    },
    create: {
      email: 'admin@clientops.local',
      fullName: 'Platform Admin',
      isPlatformAdmin: true,
      passwordHash: 'dev-only-placeholder',
    },
  });

  const org = await prisma.organization.upsert({
    where: { slug: 'demo-client' },
    update: {
      name: 'Demo Client',
      status: OrganizationStatus.active,
      primaryDomain: 'demo-client.local',
      websiteHostType: WebsiteHostType.hostinger,
    },
    create: {
      name: 'Demo Client',
      slug: 'demo-client',
      status: OrganizationStatus.active,
      primaryDomain: 'demo-client.local',
      websiteHostType: WebsiteHostType.hostinger,
      appSubdomain: 'app.demo-client.local',
      blogSubdomain: 'blog.demo-client.local',
    },
  });

  await prisma.organizationMember.upsert({
    where: {
      organizationId_userId: {
        organizationId: org.id,
        userId: admin.id,
      },
    },
    update: { role: OrganizationRole.owner },
    create: {
      organizationId: org.id,
      userId: admin.id,
      role: OrganizationRole.owner,
    },
  });

  await prisma.brandSettings.upsert({
    where: { organizationId: org.id },
    update: {
      companyDisplayName: 'Demo Client',
      primaryColor: '#111827',
      secondaryColor: '#3B82F6',
      heroTitle: 'Operate every client service from one place',
      heroSubtitle: 'White-label portal for content, support, deployments, and monitoring.',
      ctaText: 'Request an update',
      aboutText: 'Demo tenant for local development and UI scaffolding.',
      contactEmail: 'team@demo-client.local',
      updatedById: admin.id,
      socialLinks: { linkedin: 'https://linkedin.com/company/demo-client' },
    },
    create: {
      organizationId: org.id,
      companyDisplayName: 'Demo Client',
      primaryColor: '#111827',
      secondaryColor: '#3B82F6',
      heroTitle: 'Operate every client service from one place',
      heroSubtitle: 'White-label portal for content, support, deployments, and monitoring.',
      ctaText: 'Request an update',
      aboutText: 'Demo tenant for local development and UI scaffolding.',
      contactEmail: 'team@demo-client.local',
      updatedById: admin.id,
      socialLinks: { linkedin: 'https://linkedin.com/company/demo-client' },
    },
  });

  await prisma.contentBlock.upsert({
    where: {
      organizationId_key: {
        organizationId: org.id,
        key: 'hero',
      },
    },
    update: {
      label: 'Hero',
      type: ContentBlockType.cta,
      status: ContentStatus.published,
      updatedById: admin.id,
      value: {
        title: 'Your client portal, deployments, and service visibility in one system',
        description: 'Structured, portable, and secure from day one.',
        cta: { label: 'Request support', action: '/support' },
      },
    },
    create: {
      organizationId: org.id,
      key: 'hero',
      label: 'Hero',
      type: ContentBlockType.cta,
      status: ContentStatus.published,
      updatedById: admin.id,
      value: {
        title: 'Your client portal, deployments, and service visibility in one system',
        description: 'Structured, portable, and secure from day one.',
        cta: { label: 'Request support', action: '/support' },
      },
    },
  });

  const existingService = await prisma.service.findFirst({
    where: { organizationId: org.id, name: 'Website Operations' },
  });

  if (!existingService) {
    await prisma.service.create({
      data: {
        organizationId: org.id,
        name: 'Website Operations',
        type: ServiceType.website,
        status: ServiceStatus.active,
        healthStatus: HealthStatus.healthy,
        description: 'Static website management and deployment oversight.',
        metadata: { deployTarget: 'hostinger' },
      },
    });
  }

  await prisma.activityEvent.create({
    data: {
      organizationId: org.id,
      actorUserId: admin.id,
      source: 'system',
      eventType: 'seed_initialized',
      title: 'Demo workspace initialized',
      description: 'Seed data created or refreshed for the demo client.',
      metadata: { seededBy: 'prisma/seed.ts' },
    },
  });

  console.log(`Seeded admin ${admin.email} and organization ${org.slug}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
