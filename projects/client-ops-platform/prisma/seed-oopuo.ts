import { PrismaClient, ContentBlockType, ContentStatus, HealthStatus, OrganizationRole, OrganizationStatus, ServiceStatus, ServiceType, WebsiteHostType, DeploymentTargetType, IntegrationType, IntegrationStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Get or create admin user
  const admin = await prisma.user.upsert({
    where: { email: 'admin@clientops.local' },
    update: {},
    create: {
      email: 'admin@clientops.local',
      fullName: 'Platform Admin',
      isPlatformAdmin: true,
      passwordHash: 'dev-only-placeholder',
    },
  });

  // Create Oopuo organization
  const org = await prisma.organization.upsert({
    where: { slug: 'oopuo' },
    update: {
      name: 'Oopuo',
      status: OrganizationStatus.active,
      primaryDomain: 'oopuo.com',
      websiteHostType: WebsiteHostType.hostinger,
      appSubdomain: 'app.oopuo.com',
      blogSubdomain: 'blog.oopuo.com',
    },
    create: {
      name: 'Oopuo',
      slug: 'oopuo',
      status: OrganizationStatus.active,
      primaryDomain: 'oopuo.com',
      websiteHostType: WebsiteHostType.hostinger,
      appSubdomain: 'app.oopuo.com',
      blogSubdomain: 'blog.oopuo.com',
    },
  });

  // Add admin as owner
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

  // Branding
  await prisma.brandSettings.upsert({
    where: { organizationId: org.id },
    update: {
      companyDisplayName: 'Oopuo',
      primaryColor: '#0055ff',
      secondaryColor: '#0a0a0a',
      accentColor: '#00cc88',
      fontHeading: 'Space Grotesk',
      fontBody: 'Inter',
      heroTitle: 'Your outsourced digital & AI team',
      heroSubtitle: 'One team for all your digital and AI needs. Website, hosting, email, AI tools, and ongoing support — one subscription, one point of contact.',
      ctaText: 'Get Started',
      aboutText: 'Netherlands-based digital operations partner for small businesses (2-20 people) across Europe.',
      contactEmail: 'hello@oopuo.com',
      updatedById: admin.id,
      socialLinks: {
        linkedin: 'https://linkedin.com/company/oopuo',
        twitter: 'https://x.com/oopuo',
        youtube: 'https://youtube.com/@oopuo',
      },
    },
    create: {
      organizationId: org.id,
      companyDisplayName: 'Oopuo',
      primaryColor: '#0055ff',
      secondaryColor: '#0a0a0a',
      accentColor: '#00cc88',
      fontHeading: 'Space Grotesk',
      fontBody: 'Inter',
      heroTitle: 'Your outsourced digital & AI team',
      heroSubtitle: 'One team for all your digital and AI needs. Website, hosting, email, AI tools, and ongoing support — one subscription, one point of contact.',
      ctaText: 'Get Started',
      aboutText: 'Netherlands-based digital operations partner for small businesses (2-20 people) across Europe.',
      contactEmail: 'hello@oopuo.com',
      updatedById: admin.id,
      socialLinks: {
        linkedin: 'https://linkedin.com/company/oopuo',
        twitter: 'https://x.com/oopuo',
        youtube: 'https://youtube.com/@oopuo',
      },
    },
  });

  // Services
  const services = [
    { name: 'Website', type: ServiceType.website, status: ServiceStatus.active, healthStatus: HealthStatus.healthy, description: 'Static marketing site at oopuo.com — 6 pages, 6 languages, hosted on Hostinger', externalUrl: 'https://oopuo.com' },
    { name: 'DNS & Domain', type: ServiceType.custom, status: ServiceStatus.active, healthStatus: HealthStatus.healthy, description: 'oopuo.com domain — Cloudflare DNS + CDN proxy' },
    { name: 'Email', type: ServiceType.custom, status: ServiceStatus.setup, healthStatus: HealthStatus.unknown, description: 'hello@oopuo.com — Hostinger email hosting' },
    { name: 'Analytics', type: ServiceType.custom, status: ServiceStatus.setup, healthStatus: HealthStatus.unknown, description: 'Google Analytics 4 + HubSpot tracking (GA4 ID not configured yet)' },
    { name: 'Hosting', type: ServiceType.custom, status: ServiceStatus.active, healthStatus: HealthStatus.healthy, description: 'Hostinger web hosting — static file serving for oopuo.com' },
  ];

  for (const svc of services) {
    const exists = await prisma.service.findFirst({
      where: { organizationId: org.id, name: svc.name },
    });
    if (!exists) {
      await prisma.service.create({
        data: { organizationId: org.id, ...svc, metadata: {} },
      });
    }
  }

  // Deployment target — SFTP to Hostinger
  let sftpTarget = await prisma.deploymentTarget.findFirst({
    where: { organizationId: org.id, name: 'Hostinger Production' },
  });
  if (!sftpTarget) {
    sftpTarget = await prisma.deploymentTarget.create({
      data: {
        organizationId: org.id,
        name: 'Hostinger Production',
        targetType: DeploymentTargetType.sftp,
        status: 'active',
        isPrimary: true,
        config: {
          host: '147.93.38.155',
          port: 21,
          username: 'u654181864.oopuo.com',
          remotePath: '/public_html',
          protocol: 'ftp',
        },
      },
    });
  }

  // Integration placeholders
  const integrations = [
    { type: IntegrationType.ghost, name: 'Oopuo Blog', status: IntegrationStatus.setup },
    { type: IntegrationType.retell, name: 'Voice Assistant', status: IntegrationStatus.setup },
    { type: IntegrationType.analytics, name: 'Google Analytics', status: IntegrationStatus.setup },
    { type: IntegrationType.webhook, name: 'Contact Form', status: IntegrationStatus.setup },
  ];

  for (const intg of integrations) {
    const exists = await prisma.integrationConnection.findFirst({
      where: { organizationId: org.id, name: intg.name },
    });
    if (!exists) {
      await prisma.integrationConnection.create({
        data: { organizationId: org.id, ...intg, config: {} },
      });
    }
  }

  // Content blocks for the static site
  const blocks = [
    {
      key: 'hero',
      label: 'Homepage Hero',
      type: ContentBlockType.cta,
      value: {
        title: 'Your outsourced digital & AI team',
        subtitle: 'One team for all your digital and AI needs. Website, hosting, email, AI tools, and ongoing support — one subscription, one point of contact.',
        cta: { label: 'Get Started', action: '/contact.html' },
      },
    },
    {
      key: 'plans_essentials',
      label: 'Plan — Essentials',
      type: ContentBlockType.text,
      value: {
        name: 'Essentials',
        price: '€300/mo',
        features: [
          'Professional website (design + hosting)',
          'Domain & SSL setup',
          'Business email',
          'Monthly content updates',
          'Basic analytics',
          'Chat & email support',
        ],
      },
    },
    {
      key: 'plans_growth',
      label: 'Plan — Growth',
      type: ContentBlockType.text,
      value: {
        name: 'Growth',
        price: '€500/mo',
        features: [
          'Everything in Essentials',
          'Blog (Ghost CMS)',
          'AI voice assistant (Retell)',
          'SEO optimization',
          'Social media integration',
          'Weekly content updates',
          'Priority support',
        ],
      },
    },
    {
      key: 'about',
      label: 'About Section',
      type: ContentBlockType.text,
      value: {
        title: 'Built different',
        story: 'Founded by Otto — a self-taught builder who moved to the Netherlands at 18 with nothing. After years of building systems, assembling teams, and learning what small businesses actually need, Oopuo was born.',
        values: ['Radical transparency', 'One point of contact', 'AI-first operations', 'European values, global reach'],
      },
    },
    {
      key: 'contact',
      label: 'Contact Section',
      type: ContentBlockType.text,
      value: {
        title: 'Let\'s talk',
        email: 'hello@oopuo.com',
        fields: ['name', 'email', 'company', 'plan_interest', 'message'],
      },
    },
  ];

  for (const block of blocks) {
    await prisma.contentBlock.upsert({
      where: {
        organizationId_key: {
          organizationId: org.id,
          key: block.key,
        },
      },
      update: {
        label: block.label,
        type: block.type,
        status: ContentStatus.published,
        value: block.value,
        updatedById: admin.id,
      },
      create: {
        organizationId: org.id,
        key: block.key,
        label: block.label,
        type: block.type,
        status: ContentStatus.published,
        value: block.value,
        updatedById: admin.id,
      },
    });
  }

  // Activity log
  await prisma.activityEvent.create({
    data: {
      organizationId: org.id,
      actorUserId: admin.id,
      source: 'system',
      eventType: 'client_onboarded',
      title: 'Oopuo onboarded as client #1',
      description: 'Organization created with website, DNS, email, hosting services. SFTP deploy target configured. Ghost, Retell, Analytics integrations registered.',
      metadata: { seededBy: 'prisma/seed-oopuo.ts' },
    },
  });

  console.log(`✅ Oopuo onboarded — org ID: ${org.id}`);
  console.log(`   SFTP target ID: ${sftpTarget.id}`);
  console.log(`   Services: ${services.length}`);
  console.log(`   Integrations: ${integrations.length}`);
  console.log(`   Content blocks: ${blocks.length}`);
  console.log(`\n⚠️  Next: Set FTP password via platform UI or API:`);
  console.log(`   PUT /orgs/${org.id}/deployment-targets/${sftpTarget.id}/secret`);
  console.log(`   Body: { "secretKey": "password", "plainValue": "YOUR_FTP_PASSWORD" }`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
