import { PrismaClient, type ContentBlockType, type ContentStatus } from '@prisma/client';
import { z } from 'zod';
import { assertCanEditContent, assertCanManageOrganization } from './organization-access';
import { resolveAccess } from './access';

const hexColor = z.string().regex(/^#(?:[0-9a-fA-F]{3}){1,2}$/);
const emailField = z.string().email();

const brandSettingsInputSchema = z.object({
  companyDisplayName: z.string().min(1).max(200).optional(),
  primaryColor: hexColor.optional(),
  secondaryColor: hexColor.optional(),
  accentColor: hexColor.optional(),
  heroTitle: z.string().min(1).max(200).optional(),
  heroSubtitle: z.string().min(1).max(500).optional(),
  ctaText: z.string().min(1).max(120).optional(),
  aboutText: z.string().min(1).max(2000).optional(),
  contactEmail: emailField.optional(),
  contactPhone: z.string().min(3).max(50).optional(),
});

const contentBlockValueSchemaByType: Record<ContentBlockType, z.ZodTypeAny> = {
  text: z.string().min(1),
  rich_text: z.string().min(1),
  image: z.object({ assetId: z.string().optional(), url: z.string().url().optional() }).refine((v) => !!v.assetId || !!v.url, 'image block requires assetId or url'),
  cta: z.object({
    title: z.string().min(1),
    description: z.string().min(1).optional(),
    cta: z.object({ label: z.string().min(1), action: z.string().min(1) }),
  }),
  link_list: z.array(z.object({ label: z.string().min(1), url: z.string().url() })).min(1),
  stats: z.array(z.object({ label: z.string().min(1), value: z.union([z.string(), z.number()]) })).min(1),
};

export class BrandingService {
  constructor(private readonly prisma: PrismaClient) {}

  async upsertBrandSettings(params: {
    actorUserId: string;
    organizationId: string;
    input: z.input<typeof brandSettingsInputSchema>;
  }) {
    const input = brandSettingsInputSchema.parse(params.input);
    const access = await resolveAccess(this.prisma, params.actorUserId, params.organizationId);
    assertCanManageOrganization(access);

    return this.prisma.brandSettings.upsert({
      where: { organizationId: params.organizationId },
      update: { ...input, updatedById: params.actorUserId },
      create: { organizationId: params.organizationId, ...input, updatedById: params.actorUserId },
    });
  }

  async upsertContentBlock(params: {
    actorUserId: string;
    organizationId: string;
    key: string;
    label?: string;
    type: ContentBlockType;
    status?: ContentStatus;
    value: unknown;
  }) {
    // Editors can edit content, not just managers
    const access = await resolveAccess(this.prisma, params.actorUserId, params.organizationId);
    assertCanEditContent(access);

    const validatedValue = contentBlockValueSchemaByType[params.type].parse(params.value);

    // Atomic version increment using transaction
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.contentBlock.findUnique({
        where: {
          organizationId_key: {
            organizationId: params.organizationId,
            key: params.key,
          },
        },
        select: { version: true },
      });

      return tx.contentBlock.upsert({
        where: {
          organizationId_key: {
            organizationId: params.organizationId,
            key: params.key,
          },
        },
        update: {
          label: params.label,
          type: params.type,
          status: params.status,
          value: validatedValue,
          updatedById: params.actorUserId,
          version: (existing?.version ?? 0) + 1,
        },
        create: {
          organizationId: params.organizationId,
          key: params.key,
          label: params.label,
          type: params.type,
          status: params.status,
          value: validatedValue,
          updatedById: params.actorUserId,
        },
      });
    });
  }

  async buildPublishedSnapshot(organizationId: string) {
    const [brandSettings, contentBlocks] = await Promise.all([
      this.prisma.brandSettings.findUnique({ where: { organizationId } }),
      this.prisma.contentBlock.findMany({
        where: { organizationId, status: 'published' },
        orderBy: { key: 'asc' },
      }),
    ]);

    return {
      organizationId,
      branding: brandSettings,
      content: contentBlocks.reduce<Record<string, unknown>>((acc, block) => {
        acc[block.key] = {
          label: block.label,
          type: block.type,
          value: block.value,
          version: block.version,
        };
        return acc;
      }, {}),
    };
  }
}

export { brandSettingsInputSchema };
