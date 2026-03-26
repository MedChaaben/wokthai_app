import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSupabase } from '../context/SupabaseProvider';
import { fetchMyUserProfile, saveMyUserProfile, type SaveMyUserProfileInput } from '../services/user-profile';

export function useMyUserProfile() {
  const client = useSupabase();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['users', 'me', 'profile'],
    queryFn: () => fetchMyUserProfile(client),
  });

  const mutation = useMutation({
    mutationFn: (input: SaveMyUserProfileInput) => saveMyUserProfile(client, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['users', 'me', 'profile'] });
    },
  });

  return {
    profile: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    save: mutation.mutateAsync,
    isSaving: mutation.isPending,
    saveError: mutation.error,
  };
}
