export declare const signUp: <FetchOptions extends import("better-auth").ClientFetchOption<Partial<{
    name: string;
    email: string;
    password: string;
    image?: string | undefined;
    callbackURL?: string | undefined;
    rememberMe?: boolean | undefined;
}> & Record<string, any>, Partial<Record<string, any>> & Record<string, any>, Record<string, any> | undefined>>(data_0: import("better-auth").Prettify<{
    email: string;
    name: string;
    password: string;
    image?: string | undefined;
    callbackURL?: string | undefined;
    fetchOptions?: FetchOptions | undefined;
}>, data_1?: FetchOptions | undefined) => Promise<import("@better-fetch/fetch").BetterFetchResponse<NonNullable<{
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
}>, {
    code?: string | undefined;
    message?: string | undefined;
}, FetchOptions["throw"] extends true ? true : false>>;
export declare const signIn: <FetchOptions extends import("better-auth").ClientFetchOption<Partial<{
    email: string;
    password: string;
    callbackURL?: string | undefined;
    rememberMe?: boolean | undefined;
}> & Record<string, any>, Partial<Record<string, any>> & Record<string, any>, Record<string, any> | undefined>>(data_0: import("better-auth").Prettify<{
    email: string;
    password: string;
    callbackURL?: string | undefined;
    rememberMe?: boolean | undefined;
} & {
    fetchOptions?: FetchOptions | undefined;
}>, data_1?: FetchOptions | undefined) => Promise<import("@better-fetch/fetch").BetterFetchResponse<{
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
}, {
    code?: string | undefined;
    message?: string | undefined;
}, FetchOptions["throw"] extends true ? true : false>>;
export declare const signOut: <FetchOptions extends import("better-auth").ClientFetchOption<never, Partial<Record<string, any>> & Record<string, any>, Record<string, any> | undefined>>(data_0?: import("better-auth").Prettify<{
    query?: Record<string, any> | undefined;
    fetchOptions?: FetchOptions | undefined;
}> | undefined, data_1?: FetchOptions | undefined) => Promise<import("@better-fetch/fetch").BetterFetchResponse<{
    success: boolean;
}, {
    code?: string | undefined;
    message?: string | undefined;
}, FetchOptions["throw"] extends true ? true : false>>;
export declare const useSession: () => {
    data: {
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
    isPending: boolean;
    isRefetching: boolean;
    error: import("@better-fetch/fetch").BetterFetchError | null;
    refetch: (queryParams?: {
        query?: import("better-auth").SessionQueryParams;
    } | undefined) => Promise<void>;
};
