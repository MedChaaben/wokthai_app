import type { WokthaiSupabaseClient } from '../supabase/client';

/**
 * Supprime le compte courant (RPC `delete_my_account` côté Supabase).
 * Invalide la session : appeler `signOut` ensuite pour nettoyer le stockage local.
 */
export async function deleteMyAccount(client: WokthaiSupabaseClient): Promise<void> {
  const { error } = await client.rpc('delete_my_account');
  if (error) throw error;
}

export function deleteAccountErrorMessage(error: unknown): string {
  const raw =
    error && typeof error === 'object' && 'message' in error && typeof (error as { message: unknown }).message === 'string'
      ? (error as { message: string }).message
      : error instanceof Error
        ? error.message
        : '';
  const m = raw.toLowerCase();
  if (m.includes('staff_account_forbidden')) {
    return 'Les comptes équipe ne peuvent pas être supprimés depuis l’application. Contactez un administrateur.';
  }
  if (m.includes('not_authenticated')) {
    return 'Vous devez être connecté pour supprimer votre compte.';
  }
  if (raw) return raw;
  return 'La suppression du compte a échoué. Réessayez plus tard ou contactez le support.';
}
