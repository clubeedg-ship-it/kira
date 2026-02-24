import { pbkdf2Sync } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { eq, sql } from 'drizzle-orm';
import { db, pool } from './index';
import { accounts, agentWorkLog, agents, areas, decisions, dependencies, inputQueue, keyResults, milestones, objectives, principles, projects, reviews, tasks, timeBlocks, users, verification, vision, } from './schema';
dotenv.config();
const TEST_EMAIL = 'test@kira.app';
const TEST_NAME = 'Test User';
const TEST_PASSWORD = 'test1234';
function hashPassword(password) {
    const salt = 'kira-test-seed-salt-v1';
    const iterations = 120_000;
    const keyLength = 64;
    const digest = 'sha512';
    const hash = pbkdf2Sync(password, salt, iterations, keyLength, digest).toString('hex');
    return `pbkdf2_${digest}$${iterations}$${salt}$${hash}`;
}
async function countScopedRows(tableName, userId) {
    const result = await pool.query(`SELECT count(*)::int AS count FROM ${tableName} WHERE user_id = $1`, [userId]);
    return Number(result.rows[0]?.count ?? 0);
}
async function countAllRows(tableName) {
    const result = await pool.query(`SELECT count(*)::int AS count FROM ${tableName}`);
    return Number(result.rows[0]?.count ?? 0);
}
export async function runSeed() {
    const passwordHash = hashPassword(TEST_PASSWORD);
    const existingUser = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, TEST_EMAIL))
        .limit(1);
    let userId = existingUser[0]?.id;
    if (!userId) {
        const inserted = await db
            .insert(users)
            .values({
            email: TEST_EMAIL,
            name: TEST_NAME,
            emailVerified: true,
        })
            .returning({ id: users.id });
        userId = inserted[0].id;
    }
    else {
        await db
            .update(users)
            .set({
            name: TEST_NAME,
            emailVerified: true,
            updatedAt: sql `now()`,
        })
            .where(eq(users.id, userId));
    }
    await db
        .insert(accounts)
        .values({
        id: 'acct_test_user_credentials',
        userId,
        accountId: TEST_EMAIL,
        providerId: 'credentials',
        accessToken: passwordHash,
    })
        .onConflictDoUpdate({
        target: accounts.id,
        set: {
            userId,
            accountId: TEST_EMAIL,
            providerId: 'credentials',
            accessToken: passwordHash,
            updatedAt: sql `now()`,
        },
    });
    await db
        .insert(verification)
        .values({
        id: 'verification_test_user_credentials',
        identifier: TEST_EMAIL,
        value: passwordHash,
        expiresAt: '2099-01-01T00:00:00.000Z',
    })
        .onConflictDoUpdate({
        target: verification.id,
        set: {
            identifier: TEST_EMAIL,
            value: passwordHash,
            expiresAt: '2099-01-01T00:00:00.000Z',
            updatedAt: sql `now()`,
        },
    });
    await db.transaction(async (tx) => {
        await tx.delete(agentWorkLog).where(eq(agentWorkLog.userId, userId));
        await tx.delete(inputQueue).where(eq(inputQueue.userId, userId));
        await tx.delete(dependencies).where(eq(dependencies.userId, userId));
        await tx.delete(tasks).where(eq(tasks.userId, userId));
        await tx.delete(milestones).where(eq(milestones.userId, userId));
        await tx.delete(reviews).where(eq(reviews.userId, userId));
        await tx.delete(timeBlocks).where(eq(timeBlocks.userId, userId));
        await tx.delete(decisions).where(eq(decisions.userId, userId));
        await tx.delete(principles).where(eq(principles.userId, userId));
        await tx.delete(projects).where(eq(projects.userId, userId));
        await tx.delete(keyResults).where(eq(keyResults.userId, userId));
        await tx.delete(objectives).where(eq(objectives.userId, userId));
        await tx.delete(agents).where(eq(agents.userId, userId));
        await tx.delete(areas).where(eq(areas.userId, userId));
        await tx.delete(vision).where(eq(vision.userId, userId));
        const [visionRow] = await tx
            .insert(vision)
            .values({
            userId,
            statement: 'Build a life of freedom, impact, and mastery',
        })
            .returning({ id: vision.id });
        const seededAreas = await tx
            .insert(areas)
            .values([
            {
                userId,
                visionId: visionRow.id,
                name: 'AI Receptionist Business',
                description: 'Build and scale an AI receptionist service business.',
                icon: 'briefcase',
                sortOrder: 1,
            },
            {
                userId,
                visionId: visionRow.id,
                name: 'Health & Fitness',
                description: 'Maintain high energy and athletic performance.',
                icon: 'heart',
                sortOrder: 2,
            },
            {
                userId,
                visionId: visionRow.id,
                name: 'Personal Development',
                description: 'Level up systems thinking and execution discipline.',
                icon: 'brain',
                sortOrder: 3,
            },
            {
                userId,
                visionId: visionRow.id,
                name: 'Relationships',
                description: 'Invest deeply in family, friendships, and community.',
                icon: 'users',
                sortOrder: 4,
            },
        ])
            .returning({ id: areas.id, name: areas.name });
        const areaByName = Object.fromEntries(seededAreas.map((area) => [area.name, area.id]));
        const seededObjectives = await tx
            .insert(objectives)
            .values([
            {
                userId,
                areaId: areaByName['AI Receptionist Business'],
                title: 'Acquire 10 paying clients',
                description: 'Close ten active monthly contracts.',
                quarter: '2026-Q1',
                startDate: '2026-01-01',
                endDate: '2026-03-31',
            },
            {
                userId,
                areaId: areaByName['Health & Fitness'],
                title: 'Run half marathon under 2h',
                description: 'Train progressively for race-day performance.',
                quarter: '2026-Q1',
                startDate: '2026-01-01',
                endDate: '2026-03-31',
            },
        ])
            .returning({ id: objectives.id, title: objectives.title });
        const objectiveByTitle = Object.fromEntries(seededObjectives.map((objective) => [objective.title, objective.id]));
        await tx.insert(keyResults).values([
            {
                userId,
                objectiveId: objectiveByTitle['Acquire 10 paying clients'],
                title: 'Book 40 qualified sales calls',
                targetValue: 40,
                currentValue: 8,
                unit: 'calls',
                sortOrder: 1,
            },
            {
                userId,
                objectiveId: objectiveByTitle['Acquire 10 paying clients'],
                title: 'Close 10 signed client contracts',
                targetValue: 10,
                currentValue: 2,
                unit: 'clients',
                sortOrder: 2,
            },
            {
                userId,
                objectiveId: objectiveByTitle['Run half marathon under 2h'],
                title: 'Reach 18 km long run pace-consistent',
                targetValue: 18,
                currentValue: 10,
                unit: 'km',
                sortOrder: 1,
            },
            {
                userId,
                objectiveId: objectiveByTitle['Run half marathon under 2h'],
                title: 'Complete 24 structured training sessions',
                targetValue: 24,
                currentValue: 6,
                unit: 'sessions',
                sortOrder: 2,
            },
        ]);
        const seededProjects = await tx
            .insert(projects)
            .values([
            {
                userId,
                objectiveId: objectiveByTitle['Acquire 10 paying clients'],
                areaId: areaByName['AI Receptionist Business'],
                title: 'Outbound Sales Engine',
                description: 'Build repeatable outbound lead generation and follow-up.',
                ownerType: 'human',
                ownerId: 'test-user',
                status: 'active',
                priority: 0,
                deadline: '2026-03-15',
                tags: ['sales', 'pipeline'],
                sortOrder: 1,
            },
            {
                userId,
                objectiveId: objectiveByTitle['Acquire 10 paying clients'],
                areaId: areaByName['AI Receptionist Business'],
                title: 'Client Onboarding Automation',
                description: 'Automate onboarding and setup tasks for new clients.',
                ownerType: 'agent',
                ownerId: 'code-agent',
                status: 'planning',
                priority: 1,
                deadline: '2026-03-25',
                tags: ['automation', 'operations'],
                sortOrder: 2,
            },
            {
                userId,
                objectiveId: objectiveByTitle['Run half marathon under 2h'],
                areaId: areaByName['Health & Fitness'],
                title: 'Half Marathon Training Plan',
                description: 'Progressive run program with pace checkpoints.',
                ownerType: 'human',
                ownerId: 'test-user',
                status: 'active',
                priority: 1,
                deadline: '2026-03-31',
                tags: ['running'],
                sortOrder: 3,
            },
            {
                userId,
                objectiveId: objectiveByTitle['Run half marathon under 2h'],
                areaId: areaByName['Health & Fitness'],
                title: 'Nutrition & Recovery System',
                description: 'Dial in fueling, sleep, and mobility routines.',
                ownerType: 'ambiguous',
                status: 'active',
                priority: 2,
                deadline: '2026-03-20',
                tags: ['nutrition', 'recovery'],
                sortOrder: 4,
            },
        ])
            .returning({ id: projects.id, title: projects.title });
        const projectByTitle = Object.fromEntries(seededProjects.map((project) => [project.title, project.id]));
        const seededMilestones = await tx
            .insert(milestones)
            .values([
            {
                userId,
                projectId: projectByTitle['Outbound Sales Engine'],
                title: 'Finalize target ICP and offer',
                deadline: '2026-02-25',
                sortOrder: 1,
            },
            {
                userId,
                projectId: projectByTitle['Outbound Sales Engine'],
                title: 'Launch first outbound campaign',
                deadline: '2026-03-05',
                sortOrder: 2,
            },
            {
                userId,
                projectId: projectByTitle['Client Onboarding Automation'],
                title: 'Map onboarding workflow',
                deadline: '2026-03-02',
                sortOrder: 1,
            },
            {
                userId,
                projectId: projectByTitle['Client Onboarding Automation'],
                title: 'Ship onboarding portal MVP',
                deadline: '2026-03-18',
                sortOrder: 2,
            },
            {
                userId,
                projectId: projectByTitle['Half Marathon Training Plan'],
                title: 'Complete week 6 progression',
                deadline: '2026-03-01',
                sortOrder: 1,
            },
            {
                userId,
                projectId: projectByTitle['Nutrition & Recovery System'],
                title: 'Stabilize daily protein target',
                deadline: '2026-02-28',
                sortOrder: 1,
            },
        ])
            .returning({ id: milestones.id, title: milestones.title });
        const milestoneByTitle = Object.fromEntries(seededMilestones.map((milestone) => [milestone.title, milestone.id]));
        const seededAgents = await tx
            .insert(agents)
            .values([
            {
                userId,
                name: 'research-agent',
                role: 'Market and competitor research specialist',
                description: 'Finds insights, sources leads, and validates assumptions.',
                status: 'idle',
                canExecute: ['research', 'summarize', 'compare'],
                autonomy: 'checkpoint',
                areaIds: [areaByName['AI Receptionist Business'], areaByName['Personal Development']],
            },
            {
                userId,
                name: 'comms-agent',
                role: 'Messaging and outreach assistant',
                description: 'Drafts outreach sequences and client-facing communication.',
                status: 'idle',
                canExecute: ['write', 'edit', 'respond'],
                autonomy: 'checkpoint',
                areaIds: [areaByName['AI Receptionist Business'], areaByName['Relationships']],
            },
            {
                userId,
                name: 'code-agent',
                role: 'Automation and implementation engineer',
                description: 'Builds internal tooling and onboarding automations.',
                status: 'idle',
                canExecute: ['code', 'refactor', 'ship'],
                autonomy: 'checkpoint',
                areaIds: [areaByName['AI Receptionist Business']],
            },
        ])
            .returning({ id: agents.id, name: agents.name });
        const agentByName = Object.fromEntries(seededAgents.map((agent) => [agent.name, agent.id]));
        const seededTimeBlocks = await tx
            .insert(timeBlocks)
            .values([
            {
                userId,
                areaId: areaByName['AI Receptionist Business'],
                title: 'Daily Sales Sprint',
                blockType: 'work',
                dayOfWeek: 1,
                startTime: '09:00:00',
                endTime: '11:00:00',
                isRecurring: true,
            },
            {
                userId,
                areaId: areaByName['Health & Fitness'],
                title: 'Long Run Session',
                blockType: 'fitness',
                dayOfWeek: 6,
                startTime: '07:00:00',
                endTime: '09:00:00',
                isRecurring: true,
            },
        ])
            .returning({ id: timeBlocks.id, title: timeBlocks.title });
        const timeBlockByTitle = Object.fromEntries(seededTimeBlocks.map((timeBlock) => [timeBlock.title, timeBlock.id]));
        const seededTasks = await tx
            .insert(tasks)
            .values([
            {
                userId,
                projectId: projectByTitle['Outbound Sales Engine'],
                milestoneId: milestoneByTitle['Finalize target ICP and offer'],
                title: 'Call 10 warm leads from referral list',
                status: 'todo',
                priority: 1,
                executorType: 'human',
                requiresInput: 'no',
                dueDate: '2026-02-23',
                timeBlockId: timeBlockByTitle['Daily Sales Sprint'],
                durationEst: 90,
                energy: 'high',
                tags: ['sales', 'calls'],
                sortOrder: 1,
            },
            {
                userId,
                projectId: projectByTitle['Outbound Sales Engine'],
                milestoneId: milestoneByTitle['Launch first outbound campaign'],
                title: 'Draft outbound email sequence V1',
                status: 'todo',
                priority: 1,
                executorType: 'agent',
                executorId: agentByName['comms-agent'],
                requiresInput: 'verify',
                dueDate: '2026-02-24',
                durationEst: 45,
                energy: 'medium',
                source: 'inbox',
                sourceRef: 'email-thread-114',
                tags: ['outreach', 'copy'],
                sortOrder: 2,
            },
            {
                userId,
                projectId: projectByTitle['Outbound Sales Engine'],
                milestoneId: milestoneByTitle['Launch first outbound campaign'],
                title: 'Research 50 local businesses matching ICP',
                status: 'in_progress',
                priority: 2,
                executorType: 'agent',
                executorId: agentByName['research-agent'],
                requiresInput: 'no',
                dueDate: '2026-02-25',
                durationEst: 60,
                energy: 'medium',
                tags: ['research', 'leads'],
                sortOrder: 3,
            },
            {
                userId,
                projectId: projectByTitle['Client Onboarding Automation'],
                milestoneId: milestoneByTitle['Map onboarding workflow'],
                title: 'Map current onboarding steps with swimlanes',
                status: 'todo',
                priority: 1,
                executorType: 'human',
                requiresInput: 'no',
                dueDate: '2026-02-26',
                durationEst: 75,
                energy: 'high',
                context: 'Notion',
                tags: ['ops', 'mapping'],
                sortOrder: 4,
            },
            {
                userId,
                projectId: projectByTitle['Client Onboarding Automation'],
                milestoneId: milestoneByTitle['Ship onboarding portal MVP'],
                title: 'Implement onboarding portal data model',
                status: 'todo',
                priority: 1,
                executorType: 'agent',
                executorId: agentByName['code-agent'],
                requiresInput: 'verify',
                dueDate: '2026-02-28',
                durationEst: 120,
                energy: 'high',
                tags: ['backend', 'schema'],
                sortOrder: 5,
            },
            {
                userId,
                projectId: projectByTitle['Client Onboarding Automation'],
                milestoneId: milestoneByTitle['Ship onboarding portal MVP'],
                title: 'Decide onboarding checklist tool (build vs buy)',
                status: 'todo',
                priority: 2,
                executorType: 'ambiguous',
                requiresInput: 'decide',
                dueDate: '2026-03-01',
                durationEst: 30,
                energy: 'medium',
                tags: ['decision'],
                sortOrder: 6,
            },
            {
                userId,
                projectId: projectByTitle['Half Marathon Training Plan'],
                milestoneId: milestoneByTitle['Complete week 6 progression'],
                title: 'Run interval workout 6x800m',
                status: 'todo',
                priority: 1,
                executorType: 'human',
                requiresInput: 'no',
                dueDate: '2026-02-24',
                durationEst: 70,
                energy: 'high',
                tags: ['fitness', 'running'],
                sortOrder: 7,
            },
            {
                userId,
                projectId: projectByTitle['Half Marathon Training Plan'],
                title: 'Generate weekly training recap and adjustments',
                status: 'todo',
                priority: 2,
                executorType: 'agent',
                executorId: agentByName['research-agent'],
                requiresInput: 'verify',
                dueDate: '2026-02-27',
                durationEst: 20,
                energy: 'low',
                tags: ['analysis'],
                sortOrder: 8,
            },
            {
                userId,
                projectId: projectByTitle['Nutrition & Recovery System'],
                milestoneId: milestoneByTitle['Stabilize daily protein target'],
                title: 'Create grocery list for high-protein meal prep',
                status: 'todo',
                priority: 2,
                executorType: 'human',
                requiresInput: 'create',
                dueDate: '2026-02-23',
                durationEst: 25,
                energy: 'low',
                tags: ['nutrition'],
                sortOrder: 9,
            },
            {
                userId,
                projectId: projectByTitle['Nutrition & Recovery System'],
                title: 'Review wearable sleep trends and recommend changes',
                status: 'todo',
                priority: 3,
                executorType: 'ambiguous',
                requiresInput: 'verify',
                dueDate: '2026-03-03',
                durationEst: 20,
                energy: 'low',
                tags: ['recovery', 'sleep'],
                sortOrder: 10,
            },
        ])
            .returning({ id: tasks.id, title: tasks.title });
        const taskByTitle = Object.fromEntries(seededTasks.map((task) => [task.title, task.id]));
        await tx.insert(dependencies).values({
            userId,
            blockerType: 'task',
            blockerId: taskByTitle['Draft outbound email sequence V1'],
            blockedType: 'task',
            blockedId: taskByTitle['Call 10 warm leads from referral list'],
        });
        await tx.insert(inputQueue).values([
            {
                userId,
                taskId: taskByTitle['Draft outbound email sequence V1'],
                agentId: agentByName['comms-agent'],
                queueType: 'verify',
                title: 'Approve outbound email sequence',
                description: 'Review tone and approve launch.',
                options: ['Approve', 'Request changes'],
                deliverable: 'Approved sequence with edits',
                areaId: areaByName['AI Receptionist Business'],
                priority: 1,
            },
            {
                userId,
                taskId: taskByTitle['Decide onboarding checklist tool (build vs buy)'],
                agentId: agentByName['code-agent'],
                queueType: 'decide',
                title: 'Choose onboarding checklist platform',
                description: 'Select build-in-house or external vendor.',
                options: ['Build in-house', 'Buy SaaS'],
                deliverable: 'Decision with rationale',
                areaId: areaByName['AI Receptionist Business'],
                priority: 1,
            },
            {
                userId,
                taskId: taskByTitle['Create grocery list for high-protein meal prep'],
                agentId: agentByName['research-agent'],
                queueType: 'create',
                title: 'Create meal prep template',
                description: 'Draft a 7-day high-protein meal prep template.',
                options: ['Simple', 'Advanced'],
                deliverable: '7-day meal template',
                areaId: areaByName['Health & Fitness'],
                priority: 2,
            },
        ]);
        const [principleRow] = await tx
            .insert(principles)
            .values({
            userId,
            areaId: areaByName['AI Receptionist Business'],
            domain: 'Sales',
            rule: 'Prioritize channels with measurable conversion and short feedback loops.',
            rationale: 'Fast feedback compounds learning and improves close rates.',
            examples: ['Cold email A/B tests', 'Short discovery calls'],
            source: 'Founder operating principles',
        })
            .returning({ id: principles.id });
        await tx.insert(decisions).values({
            userId,
            title: 'Primary lead channel for Q1',
            context: 'Need predictable client acquisition for first 10 contracts.',
            principleId: principleRow.id,
            options: ['Cold email', 'LinkedIn outbound', 'Paid ads'],
            chosen: 'Cold email',
            reasoning: 'Fast iteration speed with clear conversion metrics.',
            projectId: projectByTitle['Outbound Sales Engine'],
            outcome: 'Campaign launched with weekly optimization cadence.',
            outcomeDate: '2026-02-20',
        });
        await tx.insert(agentWorkLog).values([
            {
                userId,
                agentId: agentByName['research-agent'],
                taskId: taskByTitle['Research 50 local businesses matching ICP'],
                projectId: projectByTitle['Outbound Sales Engine'],
                action: 'lead_research',
                details: 'Compiled 18 validated leads.',
                tokensUsed: 1432,
                costUsd: 0.16,
                durationMs: 42_000,
            },
            {
                userId,
                agentId: agentByName['code-agent'],
                taskId: taskByTitle['Implement onboarding portal data model'],
                projectId: projectByTitle['Client Onboarding Automation'],
                action: 'schema_proposal',
                details: 'Proposed onboarding entities and migration plan.',
                tokensUsed: 1980,
                costUsd: 0.22,
                durationMs: 55_000,
            },
        ]);
    });
    const counts = {
        users: await countAllRows('users'),
        vision: await countScopedRows('vision', userId),
        areas: await countScopedRows('areas', userId),
        objectives: await countScopedRows('objectives', userId),
        key_results: await countScopedRows('key_results', userId),
        projects: await countScopedRows('projects', userId),
        milestones: await countScopedRows('milestones', userId),
        tasks: await countScopedRows('tasks', userId),
        dependencies: await countScopedRows('dependencies', userId),
        agents: await countScopedRows('agents', userId),
        agent_work_log: await countScopedRows('agent_work_log', userId),
        input_queue: await countScopedRows('input_queue', userId),
        time_blocks: await countScopedRows('time_blocks', userId),
        reviews: await countScopedRows('reviews', userId),
        principles: await countScopedRows('principles', userId),
        decisions: await countScopedRows('decisions', userId),
    };
    console.log(`Seed complete for user ${userId} (${TEST_EMAIL})`);
    console.log('Credential password hash for test1234 stored in auth seed records.');
    console.table(counts);
}
async function main() {
    try {
        await runSeed();
    }
    catch (error) {
        console.error('Database seed failed.', error);
        process.exitCode = 1;
    }
    finally {
        await pool.end();
    }
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
    void main();
}
//# sourceMappingURL=seed.js.map