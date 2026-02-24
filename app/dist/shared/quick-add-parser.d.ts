export interface ParsedQuickAdd {
    title: string;
    priority: number | null;
    tags: string[];
    executorType: string | null;
    dueDate: string | null;
    projectQuery: string | null;
    durationEst: number | null;
}
export declare function parseQuickAddSyntax(input: string): ParsedQuickAdd;
