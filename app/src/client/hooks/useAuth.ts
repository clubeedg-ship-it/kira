import { signIn as signInEmail, signOut as signOutSession, signUp as signUpEmail, useSession } from '../lib/auth';

export function useAuth() {
  const sessionState = useSession();

  const signIn = async (email: string, password: string) => {
    return signInEmail({ email, password });
  };

  const signUp = async (name: string, email: string, password: string) => {
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
