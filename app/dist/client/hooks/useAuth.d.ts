export declare function useAuth(): {
    session: {
        user: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            email: string;
            emailVerified: boolean;
            name: string;
            image?: string | null | undefined;
        };
        session: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            expiresAt: Date;
            token: string;
            ipAddress?: string | null | undefined;
            userAgent?: string | null | undefined;
        };
    } | null;
    user: {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        email: string;
        emailVerified: boolean;
        name: string;
        image?: string | null | undefined;
    } | null;
    isLoading: boolean;
    isRefetching: boolean;
    error: import("@better-fetch/fetch").BetterFetchError | null;
    isAuthenticated: boolean;
    refetch: (queryParams?: {
        query?: import("better-auth").SessionQueryParams;
    } | undefined) => Promise<void>;
    signIn: (email: string, password: string) => Promise<{
        data: {
            redirect: boolean;
            token: string;
            url?: string | undefined;
            user: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                email: string;
                emailVerified: boolean;
                name: string;
                image?: string | null | undefined | undefined;
            };
        };
        error: null;
    } | {
        data: null;
        error: {
            code?: string | undefined | undefined;
            message?: string | undefined | undefined;
            status: number;
            statusText: string;
        };
    }>;
    signUp: (name: string, email: string, password: string) => Promise<{
        data: NonNullable<{
            token: null;
            user: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                email: string;
                emailVerified: boolean;
                name: string;
                image?: string | null | undefined | undefined;
            };
        } | {
            token: string;
            user: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                email: string;
                emailVerified: boolean;
                name: string;
                image?: string | null | undefined | undefined;
            };
        }>;
        error: null;
    } | {
        data: null;
        error: {
            code?: string | undefined | undefined;
            message?: string | undefined | undefined;
            status: number;
            statusText: string;
        };
    }>;
    signOut: () => Promise<{
        data: {
            success: boolean;
        };
        error: null;
    } | {
        data: null;
        error: {
            code?: string | undefined | undefined;
            message?: string | undefined | undefined;
            status: number;
            statusText: string;
        };
    }>;
};
