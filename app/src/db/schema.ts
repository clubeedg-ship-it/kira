import { sql } from 'drizzle-orm';
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  real,
  text,
  time,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    email: varchar('email', { length: 255 }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    emailVerified: boolean('email_verified').notNull().default(false),
    image: text('image'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    emailUnique: uniqueIndex('users_email_unique').on(table.email),
  }),
);

export const sessions = pgTable(
  'sessions',
  {
    id: text('id').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'string' }).notNull(),
    token: text('token').notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    userIdIdx: index('idx_sessions_user_id').on(table.userId),
    tokenUnique: uniqueIndex('sessions_token_unique').on(table.token),
  }),
);

export const accounts = pgTable(
  'accounts',
  {
    id: text('id').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'string' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    userIdIdx: index('idx_accounts_user_id').on(table.userId),
  }),
);

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'string' }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
    .notNull()
    .defaultNow(),
});

export const vision = pgTable(
  'vision',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    statement: text('statement').notNull(),
    horizon: varchar('horizon', { length: 32 }).notNull().default('10y'),
    notes: text('notes'),
    status: varchar('status', { length: 32 }).notNull().default('active'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    userIdIdx: index('idx_vision_user_id').on(table.userId),
  }),
);

export const areas = pgTable(
  'areas',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    visionId: uuid('vision_id').references(() => vision.id),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    standard: text('standard'),
    icon: varchar('icon', { length: 64 }),
    sortOrder: real('sort_order').notNull().default(0),
    status: varchar('status', { length: 32 }).notNull().default('active'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    userIdIdx: index('idx_areas_user_id').on(table.userId),
  }),
);

export const objectives = pgTable(
  'objectives',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    areaId: uuid('area_id')
      .notNull()
      .references(() => areas.id),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    quarter: varchar('quarter', { length: 16 }).notNull(),
    status: varchar('status', { length: 32 }).notNull().default('active'),
    progress: integer('progress').notNull().default(0),
    startDate: date('start_date', { mode: 'string' }),
    endDate: date('end_date', { mode: 'string' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    userIdIdx: index('idx_objectives_user_id').on(table.userId),
    areaIdx: index('idx_objectives_area').on(table.areaId),
    quarterIdx: index('idx_objectives_quarter').on(table.quarter),
  }),
);

export const keyResults = pgTable(
  'key_results',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    objectiveId: uuid('objective_id')
      .notNull()
      .references(() => objectives.id),
    title: varchar('title', { length: 255 }).notNull(),
    metricType: varchar('metric_type', { length: 32 }).notNull().default('number'),
    targetValue: real('target_value').notNull(),
    currentValue: real('current_value').notNull().default(0),
    unit: varchar('unit', { length: 32 }),
    status: varchar('status', { length: 32 }).notNull().default('active'),
    sortOrder: real('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    userIdIdx: index('idx_key_results_user_id').on(table.userId),
    objectiveIdx: index('idx_key_results_objective').on(table.objectiveId),
  }),
);

export const projects = pgTable(
  'projects',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    objectiveId: uuid('objective_id').references(() => objectives.id),
    areaId: uuid('area_id').references(() => areas.id),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    ownerType: varchar('owner_type', { length: 32 }).notNull().default('human'),
    ownerId: varchar('owner_id', { length: 255 }),
    status: varchar('status', { length: 32 }).notNull().default('planning'),
    priority: integer('priority').notNull().default(2),
    deadline: date('deadline', { mode: 'string' }),
    tags: jsonb('tags'),
    sortOrder: real('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
    completedAt: timestamp('completed_at', { withTimezone: true, mode: 'string' }),
  },
  (table) => ({
    userIdIdx: index('idx_projects_user_id').on(table.userId),
    objectiveIdx: index('idx_projects_objective').on(table.objectiveId),
    areaIdx: index('idx_projects_area').on(table.areaId),
    ownerIdx: index('idx_projects_owner').on(table.ownerType, table.ownerId),
    statusIdx: index('idx_projects_status').on(table.status),
  }),
);

export const milestones = pgTable(
  'milestones',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    deadline: date('deadline', { mode: 'string' }),
    status: varchar('status', { length: 32 }).notNull().default('pending'),
    sortOrder: real('sort_order').notNull().default(0),
    completedAt: timestamp('completed_at', { withTimezone: true, mode: 'string' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    userIdIdx: index('idx_milestones_user_id').on(table.userId),
    projectIdx: index('idx_milestones_project').on(table.projectId),
  }),
);

export const timeBlocks = pgTable(
  'time_blocks',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    areaId: uuid('area_id').references(() => areas.id),
    title: varchar('title', { length: 255 }).notNull(),
    blockType: varchar('block_type', { length: 32 }).notNull().default('work'),
    dayOfWeek: integer('day_of_week'),
    startTime: time('start_time'),
    endTime: time('end_time'),
    isRecurring: boolean('is_recurring').notNull().default(true),
    specificDate: date('specific_date', { mode: 'string' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    userIdIdx: index('idx_time_blocks_user_id').on(table.userId),
    areaIdx: index('idx_time_blocks_area').on(table.areaId),
    dayIdx: index('idx_time_blocks_day').on(table.dayOfWeek),
  }),
);

export const tasks = pgTable(
  'tasks',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    projectId: uuid('project_id').references(() => projects.id),
    milestoneId: uuid('milestone_id').references(() => milestones.id),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    status: varchar('status', { length: 32 }).notNull().default('todo'),
    priority: integer('priority').notNull().default(2),
    executorType: varchar('executor_type', { length: 32 }).notNull().default('human'),
    executorId: varchar('executor_id', { length: 255 }),
    requiresInput: varchar('requires_input', { length: 32 }).notNull().default('no'),
    dueDate: date('due_date', { mode: 'string' }),
    scheduledDate: date('scheduled_date', { mode: 'string' }),
    timeBlockId: uuid('time_block_id').references(() => timeBlocks.id),
    durationEst: integer('duration_est'),
    context: varchar('context', { length: 255 }),
    energy: varchar('energy', { length: 32 }).notNull().default('medium'),
    source: varchar('source', { length: 255 }),
    sourceRef: varchar('source_ref', { length: 255 }),
    tags: jsonb('tags'),
    sortOrder: real('sort_order').notNull().default(0),
    priorityScore: integer('priority_score').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
    completedAt: timestamp('completed_at', { withTimezone: true, mode: 'string' }),
  },
  (table) => ({
    userIdIdx: index('idx_tasks_user_id').on(table.userId),
    projectIdx: index('idx_tasks_project').on(table.projectId),
    statusIdx: index('idx_tasks_status').on(table.status),
    executorIdx: index('idx_tasks_executor').on(table.executorType, table.executorId),
    dueIdx: index('idx_tasks_due').on(table.dueDate),
    scheduledIdx: index('idx_tasks_scheduled').on(table.scheduledDate),
  }),
);

export const dependencies = pgTable(
  'dependencies',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    blockerType: varchar('blocker_type', { length: 32 }).notNull(),
    blockerId: uuid('blocker_id').notNull(),
    blockedType: varchar('blocked_type', { length: 32 }).notNull(),
    blockedId: uuid('blocked_id').notNull(),
    depType: varchar('dep_type', { length: 32 }).notNull().default('finish_to_start'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    userIdIdx: index('idx_dependencies_user_id').on(table.userId),
    blockerIdx: index('idx_dependencies_blocker').on(table.blockerId),
    blockedIdx: index('idx_dependencies_blocked').on(table.blockedId),
    blockerBlockedUnique: uniqueIndex('dependencies_blocker_blocked_unique').on(
      table.blockerId,
      table.blockedId,
    ),
  }),
);

export const agents = pgTable(
  'agents',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    name: varchar('name', { length: 255 }).notNull(),
    role: varchar('role', { length: 255 }).notNull(),
    description: text('description'),
    model: varchar('model', { length: 128 })
      .notNull()
      .default('claude-sonnet-4-5-20250514'),
    status: varchar('status', { length: 32 }).notNull().default('idle'),
    canExecute: jsonb('can_execute'),
    autonomy: varchar('autonomy', { length: 32 }).notNull().default('checkpoint'),
    areaIds: jsonb('area_ids'),
    maxConcurrent: integer('max_concurrent').notNull().default(3),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    userIdIdx: index('idx_agents_user_id').on(table.userId),
  }),
);

export const agentWorkLog = pgTable(
  'agent_work_log',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    agentId: uuid('agent_id')
      .notNull()
      .references(() => agents.id),
    taskId: uuid('task_id').references(() => tasks.id),
    projectId: uuid('project_id').references(() => projects.id),
    action: varchar('action', { length: 255 }).notNull(),
    details: text('details'),
    outputRef: text('output_ref'),
    tokensUsed: integer('tokens_used'),
    costUsd: real('cost_usd'),
    durationMs: integer('duration_ms'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    userIdIdx: index('idx_agent_work_log_user_id').on(table.userId),
    agentIdx: index('idx_agent_work_log_agent').on(table.agentId),
    taskIdx: index('idx_agent_work_log_task').on(table.taskId),
  }),
);

export const inputQueue = pgTable(
  'input_queue',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    taskId: uuid('task_id').references(() => tasks.id),
    agentId: uuid('agent_id').references(() => agents.id),
    queueType: varchar('queue_type', { length: 32 }).notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    options: jsonb('options'),
    deliverable: text('deliverable'),
    areaId: uuid('area_id').references(() => areas.id),
    priority: integer('priority').notNull().default(2),
    status: varchar('status', { length: 32 }).notNull().default('pending'),
    scheduledFor: timestamp('scheduled_for', { withTimezone: true, mode: 'string' }),
    resolvedAt: timestamp('resolved_at', { withTimezone: true, mode: 'string' }),
    resolution: text('resolution'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    userIdIdx: index('idx_input_queue_user_id').on(table.userId),
    statusIdx: index('idx_input_queue_status').on(table.status),
    areaIdx: index('idx_input_queue_area').on(table.areaId),
  }),
);

export const reviews = pgTable(
  'reviews',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    reviewType: varchar('review_type', { length: 32 }).notNull(),
    scheduled: timestamp('scheduled', { withTimezone: true, mode: 'string' }).notNull(),
    status: varchar('status', { length: 32 }).notNull().default('pending'),
    insights: text('insights'),
    decisions: jsonb('decisions'),
    completedAt: timestamp('completed_at', { withTimezone: true, mode: 'string' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    userIdIdx: index('idx_reviews_user_id').on(table.userId),
    typeStatusIdx: index('idx_reviews_type_status').on(table.reviewType, table.status),
  }),
);

export const principles = pgTable(
  'principles',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    areaId: uuid('area_id').references(() => areas.id),
    domain: varchar('domain', { length: 255 }).notNull(),
    rule: text('rule').notNull(),
    rationale: text('rationale'),
    examples: jsonb('examples'),
    confidence: real('confidence').notNull().default(0.7),
    source: varchar('source', { length: 255 }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    userIdIdx: index('idx_principles_user_id').on(table.userId),
  }),
);

export const decisions = pgTable(
  'decisions',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    title: varchar('title', { length: 255 }).notNull(),
    context: text('context').notNull(),
    principleId: uuid('principle_id').references(() => principles.id),
    options: jsonb('options'),
    chosen: text('chosen').notNull(),
    reasoning: text('reasoning'),
    outcome: text('outcome'),
    outcomeDate: date('outcome_date', { mode: 'string' }),
    projectId: uuid('project_id').references(() => projects.id),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    userIdIdx: index('idx_decisions_user_id').on(table.userId),
    principleIdx: index('idx_decisions_principle').on(table.principleId),
  }),
);

export const userXp = pgTable(
  'user_xp',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    totalXp: integer('total_xp').notNull().default(0),
    level: integer('level').notNull().default(1),
    currentStreak: integer('current_streak').notNull().default(0),
    longestStreak: integer('longest_streak').notNull().default(0),
    lastActiveDate: date('last_active_date', { mode: 'string' }),
    streakFreezesAvailable: integer('streak_freezes_available').notNull().default(1),
    streakFreezesUsedThisWeek: integer('streak_freezes_used_this_week').notNull().default(0),
    featuresUsed: jsonb('features_used'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    userIdUnique: uniqueIndex('user_xp_user_id_unique').on(table.userId),
  }),
);

export const conversations = pgTable(
  'conversations',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    title: varchar('title', { length: 255 }).notNull().default('New conversation'),
    model: varchar('model', { length: 128 }).notNull().default('minimax/minimax-m1-80k'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    userIdIdx: index('idx_conversations_user_id').on(table.userId),
  }),
);

export const messages = pgTable(
  'messages',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => conversations.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    role: varchar('role', { length: 32 }).notNull(),
    content: text('content').notNull(),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    conversationIdx: index('idx_messages_conversation').on(table.conversationId),
    userIdIdx: index('idx_messages_user_id').on(table.userId),
  }),
);

export const documents = pgTable(
  'documents',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    title: varchar('title', { length: 512 }).notNull(),
    content: text('content').notNull().default(''),
    folder: varchar('folder', { length: 255 }),
    tags: jsonb('tags'),
    mimeType: varchar('mime_type', { length: 128 }).notNull().default('text/markdown'),
    summary: text('summary'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    userIdIdx: index('idx_documents_user_id').on(table.userId),
    folderIdx: index('idx_documents_folder').on(table.folder),
  }),
);

export const userSettings = pgTable(
  'user_settings',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    settings: jsonb('settings').notNull().default({}),
    selfEvolutionEnabled: boolean('self_evolution_enabled').notNull().default(false),
    agentName: varchar('agent_name', { length: 64 }).default('Kira'),
    agentEmoji: varchar('agent_emoji', { length: 8 }).default('⚡'),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    userIdUnique: uniqueIndex('user_settings_user_id_unique').on(table.userId),
  }),
);

// ── Knowledge Graph ──────────────────────────────────────────────────────────

export const entities = pgTable(
  'entities',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    type: varchar('type', { length: 64 }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    aliases: jsonb('aliases'),
    properties: jsonb('properties'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    userIdIdx: index('idx_entities_user_id').on(table.userId),
    typeIdx: index('idx_entities_type').on(table.type),
  }),
);

export const relationships = pgTable(
  'relationships',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    sourceEntityId: uuid('source_entity_id')
      .notNull()
      .references(() => entities.id),
    targetEntityId: uuid('target_entity_id')
      .notNull()
      .references(() => entities.id),
    type: varchar('type', { length: 128 }).notNull(),
    properties: jsonb('properties'),
    confidence: real('confidence').notNull().default(1.0),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    userIdIdx: index('idx_relationships_user_id').on(table.userId),
    sourceIdx: index('idx_relationships_source').on(table.sourceEntityId),
    targetIdx: index('idx_relationships_target').on(table.targetEntityId),
  }),
);

export const facts = pgTable(
  'facts',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    entityId: uuid('entity_id')
      .notNull()
      .references(() => entities.id),
    key: varchar('key', { length: 255 }).notNull(),
    value: text('value').notNull(),
    source: varchar('source', { length: 255 }),
    confidence: real('confidence').notNull().default(1.0),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    userIdIdx: index('idx_facts_user_id').on(table.userId),
    entityIdx: index('idx_facts_entity').on(table.entityId),
  }),
);

export const extractedSuggestions = pgTable(
  'extracted_suggestions',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    conversationId: uuid('conversation_id').notNull(),
    type: varchar('type', { length: 32 }).notNull(), // 'task' | 'entity' | 'decision'
    content: text('content').notNull(),
    metadata: jsonb('metadata'),
    status: varchar('status', { length: 32 }).notNull().default('pending'), // pending | accepted | dismissed
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    userIdIdx: index('idx_extracted_suggestions_user_id').on(table.userId),
    statusIdx: index('idx_extracted_suggestions_status').on(table.status),
    conversationIdx: index('idx_extracted_suggestions_conversation').on(table.conversationId),
  }),
);

// ── User Agents (cron/automation) ────────────────────────────────────────────

export const userAgents = pgTable(
  'user_agents',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    name: varchar('name', { length: 255 }).notNull(),
    type: varchar('type', { length: 32 }).notNull().default('custom'),
    model: varchar('model', { length: 255 }).notNull().default('minimax/minimax-m2.5'),
    systemPrompt: text('system_prompt').notNull(),
    tools: jsonb('tools').default([]),
    schedule: varchar('schedule', { length: 255 }),
    enabled: boolean('enabled').notNull().default(true),
    config: jsonb('config').default({}),
    lastRunAt: timestamp('last_run_at', { withTimezone: true, mode: 'string' }),
    nextRunAt: timestamp('next_run_at', { withTimezone: true, mode: 'string' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    userIdIdx: index('idx_user_agents_user_id').on(table.userId),
    typeIdx: index('idx_user_agents_type').on(table.type),
  }),
);

export const agentRuns = pgTable(
  'agent_runs',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    agentId: uuid('agent_id')
      .references(() => userAgents.id),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    status: varchar('status', { length: 32 }).notNull().default('pending'),
    input: text('input'),
    output: text('output'),
    tokensUsed: integer('tokens_used'),
    cost: real('cost'),
    error: text('error'),
    startedAt: timestamp('started_at', { withTimezone: true, mode: 'string' }),
    finishedAt: timestamp('finished_at', { withTimezone: true, mode: 'string' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    agentIdx: index('idx_agent_runs_agent').on(table.agentId),
    userIdIdx: index('idx_agent_runs_user_id').on(table.userId),
    statusIdx: index('idx_agent_runs_status').on(table.status),
  }),
);

export const xpEvents = pgTable(
  'xp_events',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    amount: integer('amount').notNull(),
    reason: text('reason').notNull(),
    referenceId: uuid('reference_id'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    userIdIdx: index('idx_xp_events_user_id').on(table.userId),
  }),
);

// ── Prompt Enhancement Engine ────────────────────────────────────────────────

export const promptPatterns = pgTable(
  'prompt_patterns',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    intentType: varchar('intent_type', { length: 64 }),
    inputPattern: text('input_pattern'),
    template: text('template').notNull(),
    successCount: integer('success_count').notNull().default(0),
    failureCount: integer('failure_count').notNull().default(0),
    score: real('score').notNull().default(0.5),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    userIdIdx: index('idx_prompt_patterns_user_id').on(table.userId),
    intentIdx: index('idx_prompt_patterns_intent').on(table.intentType),
  }),
);

export const promptLog = pgTable(
  'prompt_log',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    conversationId: uuid('conversation_id'),
    rawInput: text('raw_input').notNull(),
    enhancedPrompt: text('enhanced_prompt').notNull(),
    outcome: varchar('outcome', { length: 32 }),
    feedback: text('feedback'),
    latencyMs: integer('latency_ms'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    userIdIdx: index('idx_prompt_log_user_id').on(table.userId),
    conversationIdx: index('idx_prompt_log_conversation').on(table.conversationId),
  }),
);

export const userPreferences = pgTable(
  'user_preferences',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    key: varchar('key', { length: 128 }).notNull(),
    value: text('value').notNull(),
    confidence: real('confidence').notNull().default(0.5),
    source: varchar('source', { length: 64 }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    userIdIdx: index('idx_user_preferences_user_id').on(table.userId),
    keyIdx: index('idx_user_preferences_key').on(table.key),
  }),
);

// ── Memory System ────────────────────────────────────────────────────────────

export const memoryShortTerm = pgTable('memory_short_term', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid('user_id').notNull().references(() => users.id),
  type: varchar('type', { length: 32 }).notNull(),
  content: text('content').notNull(),
  sourceConversationId: uuid('source_conversation_id'),
  importance: real('importance').notNull().default(0.5),
  promoted: boolean('promoted').notNull().default(false),
  expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'string' }),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
});

export const memoryStaging = pgTable('memory_staging', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid('user_id').notNull().references(() => users.id),
  agentRunId: uuid('agent_run_id'),
  type: varchar('type', { length: 32 }).notNull(),
  data: jsonb('data').notNull(),
  status: varchar('status', { length: 32 }).notNull().default('pending'),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true, mode: 'string' }),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
});

// ── Chat Panels (Split Window) ────────────────────────────────────────────────

export const chatPanels = pgTable('chat_panels', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid('user_id').notNull().references(() => users.id),
  agentId: uuid('agent_id'),
  conversationId: uuid('conversation_id'),
  title: varchar('title', { length: 255 }).notNull().default('New Chat'),
  position: integer('position').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
});

// ── User Containers (Persistent Sandbox) ─────────────────────────────────────

// ── Canvas States (Live Canvas Runtime) ──────────────────────────────────────

export const canvasStates = pgTable('canvas_states', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid('user_id').notNull().references(() => users.id),
  conversationId: uuid('conversation_id'),
  type: varchar('type', { length: 32 }).notNull(),
  title: varchar('title', { length: 255 }),
  content: jsonb('content').notNull(),
  status: varchar('status', { length: 32 }).notNull().default('active'),
  response: jsonb('response'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index('idx_canvas_states_user_id').on(table.userId),
  statusIdx: index('idx_canvas_states_status').on(table.status),
}));

export const userContainers = pgTable('user_containers', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid('user_id').notNull().unique().references(() => users.id),
  containerId: varchar('container_id', { length: 64 }),
  status: varchar('status', { length: 32 }).notNull().default('creating'),
  image: varchar('image', { length: 128 }).notNull().default('kira-sandbox:latest'),
  ports: jsonb('ports').default({}),
  diskUsageMb: integer('disk_usage_mb').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  lastActiveAt: timestamp('last_active_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
});

// ── Identity / Soul System ───────────────────────────────────────────────────

export const userIdentity = pgTable('user_identity', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid('user_id').notNull().references(() => users.id),
  fileKey: varchar('file_key', { length: 32 }).notNull(),
  content: text('content').notNull().default(''),
  version: integer('version').notNull().default(1),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow(),
  updatedBy: varchar('updated_by', { length: 16 }).default('system'),
}, (t) => ({
  userFileUnique: unique('user_identity_user_file_unique').on(t.userId, t.fileKey),
}));

export const identityChangelog = pgTable('identity_changelog', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid('user_id').notNull(),
  fileKey: varchar('file_key', { length: 32 }).notNull(),
  oldContent: text('old_content'),
  newContent: text('new_content'),
  reason: text('reason'),
  approved: boolean('approved'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow(),
});

// ── Skills System ────────────────────────────────────────────────────────────

export const skills = pgTable('skills', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  slug: varchar('slug', { length: 64 }).unique().notNull(),
  name: varchar('name', { length: 128 }).notNull(),
  description: text('description').notNull(),
  longDescription: text('long_description'),
  category: varchar('category', { length: 32 }),
  subcategory: varchar('subcategory', { length: 64 }),
  instructions: text('instructions').notNull(),
  icon: varchar('icon', { length: 32 }).default('Zap'),
  author: varchar('author', { length: 128 }).default('Kira Team'),
  sourceUrl: varchar('source_url', { length: 512 }),
  version: varchar('version', { length: 16 }).default('1.0.0'),
  tags: text('tags'),
  downloads: integer('downloads').default(0),
  rating: real('rating').default(0),
  isPremium: boolean('is_premium').default(false),
  isSystem: boolean('is_system').default(false),
  isVerified: boolean('is_verified').default(false),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow(),
});

/* ── Context Metrics (observability) ───────────────── */

export const contextMetrics = pgTable('context_metrics', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid('user_id').notNull().references(() => users.id),
  conversationId: uuid('conversation_id').notNull(),
  messageId: uuid('message_id').notNull(),
  systemPromptTokens: integer('system_prompt_tokens').notNull(),
  historyTokens: integer('history_tokens').notNull(),
  responseTokens: integer('response_tokens').notNull(),
  efficiencyScore: real('efficiency_score').notNull(),
  classification: varchar('classification', { length: 32 }).notNull(),
  sectionsIncluded: jsonb('sections_included').default([]),
  sectionsReferenced: jsonb('sections_referenced').default([]),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
}, (t) => ({
  userIdx: index('idx_context_metrics_user').on(t.userId),
  convIdx: index('idx_context_metrics_conv').on(t.conversationId),
  createdIdx: index('idx_context_metrics_created').on(t.createdAt),
}));

export const userSkills = pgTable('user_skills', {
  userId: uuid('user_id').notNull().references(() => users.id),
  skillId: uuid('skill_id').notNull().references(() => skills.id),
  enabled: boolean('enabled').default(true),
  installedAt: timestamp('installed_at', { withTimezone: true, mode: 'string' }).defaultNow(),
}, (t) => ({
  pk: primaryKey(t.userId, t.skillId),
}));
