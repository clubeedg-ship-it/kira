export declare function canSelfEvolve(userId: string): Promise<boolean>;
export declare function updateIdentityFile(userId: string, fileKey: string, newContent: string, reason: string, updatedBy?: 'user' | 'agent'): Promise<{
    success: boolean;
    message: string;
}>;
