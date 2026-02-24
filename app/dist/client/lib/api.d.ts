export declare class ApiError extends Error {
    code: string;
    status: number;
    constructor(message: string, code: string, status: number);
}
export declare function apiRequest<T>(path: string, options?: RequestInit): Promise<T>;
