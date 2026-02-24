import { createAuthClient } from 'better-auth/react';
const authClient = createAuthClient({
    baseURL: `${window.location.origin}/api/v1/auth`,
});
export const signUp = authClient.signUp.email;
export const signIn = authClient.signIn.email;
export const signOut = authClient.signOut;
export const useSession = authClient.useSession;
//# sourceMappingURL=auth.js.map