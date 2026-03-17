import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth-context';

export function useOrgQuery<T>(key: string, path: string) {
  const { orgId } = useAuth();
  return useQuery<T>({
    queryKey: [key, orgId],
    queryFn: () => api.get<T>(`/orgs/${orgId}/${path}`),
    enabled: !!orgId,
  });
}

export function useOrgMutation<TInput, TOutput = unknown>(
  path: string,
  method: 'post' | 'patch' | 'put' = 'post',
  invalidateKeys?: string[],
) {
  const { orgId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation<TOutput, Error, TInput>({
    mutationFn: (input) => api[method]<TOutput>(`/orgs/${orgId}/${path}`, input),
    onSuccess: () => {
      invalidateKeys?.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: [key, orgId] });
      });
    },
  });
}
