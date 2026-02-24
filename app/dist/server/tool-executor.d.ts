/**
 * Shared tool execution logic used by both chat routes and agent executor.
 */
export declare function executeTool(toolName: string, args: Record<string, unknown>, userId: string): Promise<string>;
/** The TOOLS array in OpenAI function-calling format */
export declare const TOOL_DEFINITIONS: ({
    type: "function";
    function: {
        name: string;
        description: string;
        parameters: {
            type: string;
            properties: {
                code: {
                    type: string;
                    description: string;
                };
                language: {
                    type: string;
                    enum: string[];
                };
                query?: undefined;
                status?: undefined;
                type?: undefined;
                title?: undefined;
                description?: undefined;
                priority?: undefined;
                projectId?: undefined;
                content?: undefined;
                filename?: undefined;
            };
            required: string[];
        };
    };
} | {
    type: "function";
    function: {
        name: string;
        description: string;
        parameters: {
            type: string;
            properties: {
                query: {
                    type: string;
                };
                status: {
                    type: string;
                    enum: string[];
                };
                code?: undefined;
                language?: undefined;
                type?: undefined;
                title?: undefined;
                description?: undefined;
                priority?: undefined;
                projectId?: undefined;
                content?: undefined;
                filename?: undefined;
            };
            required: never[];
        };
    };
} | {
    type: "function";
    function: {
        name: string;
        description: string;
        parameters: {
            type: string;
            properties: {
                code?: undefined;
                language?: undefined;
                query?: undefined;
                status?: undefined;
                type?: undefined;
                title?: undefined;
                description?: undefined;
                priority?: undefined;
                projectId?: undefined;
                content?: undefined;
                filename?: undefined;
            };
            required: never[];
        };
    };
} | {
    type: "function";
    function: {
        name: string;
        description: string;
        parameters: {
            type: string;
            properties: {
                query: {
                    type: string;
                };
                type: {
                    type: string;
                    enum: string[];
                };
                code?: undefined;
                language?: undefined;
                status?: undefined;
                title?: undefined;
                description?: undefined;
                priority?: undefined;
                projectId?: undefined;
                content?: undefined;
                filename?: undefined;
            };
            required: string[];
        };
    };
} | {
    type: "function";
    function: {
        name: string;
        description: string;
        parameters: {
            type: string;
            properties: {
                title: {
                    type: string;
                };
                description: {
                    type: string;
                };
                priority: {
                    type: string;
                    enum: number[];
                };
                projectId: {
                    type: string;
                };
                code?: undefined;
                language?: undefined;
                query?: undefined;
                status?: undefined;
                type?: undefined;
                content?: undefined;
                filename?: undefined;
            };
            required: string[];
        };
    };
} | {
    type: "function";
    function: {
        name: string;
        description: string;
        parameters: {
            type: string;
            properties: {
                title: {
                    type: string;
                };
                content: {
                    type: string;
                };
                code?: undefined;
                language?: undefined;
                query?: undefined;
                status?: undefined;
                type?: undefined;
                description?: undefined;
                priority?: undefined;
                projectId?: undefined;
                filename?: undefined;
            };
            required: string[];
        };
    };
} | {
    type: "function";
    function: {
        name: string;
        description: string;
        parameters: {
            type: string;
            properties: {
                filename: {
                    type: string;
                };
                code?: undefined;
                language?: undefined;
                query?: undefined;
                status?: undefined;
                type?: undefined;
                title?: undefined;
                description?: undefined;
                priority?: undefined;
                projectId?: undefined;
                content?: undefined;
            };
            required: string[];
        };
    };
} | {
    type: "function";
    function: {
        name: string;
        description: string;
        parameters: {
            type: string;
            properties: {
                filename: {
                    type: string;
                };
                content: {
                    type: string;
                };
                code?: undefined;
                language?: undefined;
                query?: undefined;
                status?: undefined;
                type?: undefined;
                title?: undefined;
                description?: undefined;
                priority?: undefined;
                projectId?: undefined;
            };
            required: string[];
        };
    };
})[];
