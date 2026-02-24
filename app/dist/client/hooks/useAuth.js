import { signIn as signInEmail, signOut as signOutSession, signUp as signUpEmail, useSession } from '../lib/auth';
export function useAuth() {
    const sessionState = useSession();
    const signIn = async (email, password) => {
        return signInEmail({ email, password });
    };
    const signUp = async (name, email, password) => {
        return signUpEmail({ name, email, password });
    };
    const signOut = async () => {
        return signOutSession();
    };
    return {
        session: sessionState.data ?? null,
        user: sessionState.data?.user ?? null,
        isLoading: sessionState.isPending,
        isRefetching: sessionState.isRefetching,
        error: sessionState.error,
        isAuthenticated: Boolean(sessionState.data?.user),
        refetch: sessionState.refetch,
        signIn,
        signUp,
        signOut
    };
}
//# sourceMappingURL=useAuth.js.map