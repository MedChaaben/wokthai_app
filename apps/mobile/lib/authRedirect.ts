/**
 * Paramètre `redirect` après login : chemins internes uniquement (pas d’open redirect).
 */
export function safeAuthRedirectPath(raw: unknown): string {
  const s = Array.isArray(raw) ? raw[0] : raw;
  if (typeof s !== 'string' || s.length === 0) return '/(tabs)';
  try {
    const decoded = decodeURIComponent(s.trim());
    if (!decoded.startsWith('/') || decoded.includes('//') || decoded.includes('..')) {
      return '/(tabs)';
    }
    return decoded;
  } catch {
    return '/(tabs)';
  }
}
