export declare const auth: import("better-auth").Auth<{
    baseURL: string;
    basePath: string;
    trustedOrigins: string[];
    secret: string | undefined;
    database: (options: import("better-auth").BetterAuthOptions) => import("better-auth").DBAdapter<import("better-auth").BetterAuthOptions>;
    emailAndPassword: {
        enabled: true;
    };
    user: {
        modelName: string;
    };
    session: {
        modelName: string;
    };
    account: {
        modelName: string;
        fields: {
            password: string;
        };
    };
    verification: {
        modelName: string;
    };
    databaseHooks: {
        user: {
            create: {
                after: (user: {
                    id: string;
                    createdAt: Date;
                    updatedAt: Date;
                    email: string;
                    emailVerified: boolean;
                    name: string;
                    image?: string | null | undefined;
                } & Record<string, unknown>) => Promise<void>;
            };
        };
    };
    advanced: {
        database: {
            generateId: () => `${string}-${string}-${string}-${string}-${string}`;
        };
        defaultCookieAttributes: {
            httpOnly: true;
            sameSite: "lax";
            secure: boolean;
        };
    };
}>;
