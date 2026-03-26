export type ParsedAuthCallback = {
  access_token: string;
  refresh_token: string;
  /** ex. recovery (mot de passe), signup (confirmation email), email_change */
  type: string | null;
};

/**
 * Extrait access_token / refresh_token / type depuis une URL de callback Supabase Auth
 * (fragment #... ou query ?... selon le template / flux).
 */
export function parseSupabaseAuthCallback(url: string): ParsedAuthCallback | null {
  const tryParams = (raw: string): ParsedAuthCallback | null => {
    const params = new URLSearchParams(raw);
    const access_token = params.get('access_token');
    const refresh_token = params.get('refresh_token');
    if (!access_token || !refresh_token) return null;
    return {
      access_token,
      refresh_token,
      type: params.get('type'),
    };
  };

  const hashIdx = url.indexOf('#');
  if (hashIdx !== -1) {
    const fromHash = tryParams(url.slice(hashIdx + 1));
    if (fromHash) return fromHash;
  }

  const qIdx = url.indexOf('?');
  if (qIdx !== -1) {
    const q = url.slice(qIdx + 1).split('#')[0];
    const fromQuery = tryParams(q);
    if (fromQuery) return fromQuery;
  }

  return null;
}

/** Après setSession depuis l’URL : où router selon le flux Auth. */
export function routeAfterAuthCallback(type: string | null): '/reset-password' | '/menu' {
  return type === 'recovery' ? '/reset-password' : '/menu';
}
