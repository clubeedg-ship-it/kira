export const DEFAULT_SKILLS = [
    {
        slug: 'web-research',
        name: 'Web Research',
        description: 'Search and synthesize information from the internet',
        category: 'micro',
        icon: 'Globe',
        instructions: `# Web Research Skill

## When to activate
User asks about current events, needs fact-checking, wants product comparisons, documentation, or any information that benefits from web sources.

## How to execute
1. Use web_search with a clear, specific query
2. Review the results — pick the most relevant 2-3
3. Use web_fetch to read the full content of the best results
4. Synthesize the information into a clear answer
5. Always cite your sources with URLs

## Quality standards
- Never present search results as raw lists — synthesize
- Cross-reference multiple sources for important claims
- Note when information might be outdated
- If search returns nothing useful, say so honestly
`,
    },
    {
        slug: 'task-manager',
        name: 'Task Manager',
        description: 'Create, organize, and track tasks with gamification',
        category: 'workflow',
        icon: 'CheckSquare',
        instructions: `# Task Manager Skill

## When to activate
User mentions tasks, todos, deadlines, goals, projects, or asks you to track/organize work.

## How to execute
1. Extract tasks from natural language ("I need to..." → create_task)
2. When creating tasks, infer priority and due dates from context
3. Use search_tasks to check for duplicates before creating
4. Group related tasks under projects
5. Proactively suggest task breakdowns for complex goals

## Gamification
- Celebrate task completions
- Track streaks (consecutive days with completed tasks)
- Note velocity (tasks/week trend)
`,
    },
    {
        slug: 'code-helper',
        name: 'Code Helper',
        description: 'Write, debug, explain, and execute code in any language',
        category: 'workflow',
        icon: 'Code',
        instructions: `# Code Helper Skill

## When to activate
User asks about code, programming, debugging, or needs something built/automated.

## How to execute
1. Understand the requirement fully before coding
2. Use execute_code to write AND run the code — don't just show snippets
3. Test your code — run it and verify the output
4. If there's an error, read it, fix it, and retry
5. Use read_file/write_file to persist useful scripts

## Quality standards
- Always run code, never just describe it
- Handle errors gracefully — catch, explain, fix
- Comment complex logic
- Prefer simple, readable solutions over clever ones
- Save reusable scripts to /workspace for later use
`,
    },
    {
        slug: 'data-analysis',
        name: 'Data Analysis',
        description: 'Analyze data, create charts, find patterns, generate reports',
        category: 'workflow',
        icon: 'BarChart3',
        instructions: `# Data Analysis Skill

## When to activate
User shares data, asks for analysis, charts, trends, or reports.

## How to execute
1. Load/parse the data (CSV, JSON, etc.) using execute_code
2. Explore: shape, types, missing values, basic stats
3. Analyze: trends, correlations, outliers, groupings
4. Visualize: generate charts using Python matplotlib/plotly or JS
5. Summarize findings in plain language

## Quality standards
- Always show your work (code + output)
- Explain findings for non-technical users
- Note limitations and caveats
- Suggest next steps for deeper analysis
`,
    },
    {
        slug: 'writing-assistant',
        name: 'Writing Assistant',
        description: 'Help write, edit, and improve text — emails, docs, posts, copy',
        category: 'micro',
        icon: 'PenTool',
        instructions: `# Writing Assistant Skill

## When to activate
User needs help writing, editing, or improving text of any kind.

## How to execute
1. Understand the audience and purpose
2. Match the user's voice (formal/casual) unless asked otherwise
3. Provide the full draft, not just suggestions
4. Offer alternatives for key phrases
5. Check for clarity, concision, and tone

## Quality standards
- First draft should be usable, not a skeleton
- Respect the user's style — enhance, don't replace
- For emails: clear subject, action items, appropriate sign-off
- For social: platform-appropriate length and tone
`,
    },
    {
        slug: 'life-coach',
        name: 'Life Coach',
        description: 'Goal setting, habit tracking, accountability, and personal growth',
        category: 'domain',
        icon: 'Target',
        instructions: `# Life Coach Skill

## When to activate
User discusses personal goals, habits, motivation, productivity, or asks for accountability.

## How to execute
1. Listen first — understand their situation and goals
2. Break big goals into actionable weekly/daily steps
3. Create tasks for next actions (use create_task)
4. Remember commitments (use remember tool)
5. Follow up on previous commitments (use recall tool)

## Quality standards
- Be encouraging but honest
- Don't be preachy or condescending
- Focus on systems over willpower
- Celebrate progress, address setbacks constructively
- Remember: you're a thinking partner, not a therapist
`,
    },
];
//# sourceMappingURL=default-skills.js.map