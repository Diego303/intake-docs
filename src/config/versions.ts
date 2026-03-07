export interface VersionConfig {
  id: string;       // "v0-1-0" (slug format)
  label: string;    // "v0.1.0" (display format)
  latest: boolean;
}

export const VERSIONS: VersionConfig[] = [
  { id: 'v0-6-0', label: 'v0.6.0', latest: true },
  { id: 'v0-5-0', label: 'v0.5.0', latest: false },
  { id: 'v0-4-0', label: 'v0.4.0', latest: false },
  { id: 'v0-3-0', label: 'v0.3.0', latest: false },
  { id: 'v0-2-0', label: 'v0.2.0', latest: false },
  { id: 'v0-1-0', label: 'v0.1.0', latest: false },
];

/** Extract version id from a slug like "v0-1-0/getting-started" */
export function getVersionFromSlug(slug: string): string {
  return slug.split('/')[0];
}

/** Extract doc slug from a full slug like "v0-1-0/getting-started" → "getting-started" */
export function getDocSlug(slug: string): string {
  const parts = slug.split('/');
  return parts.slice(1).join('/');
}

/** Get versions that have content for a given language */
export async function getVersionsForLang(lang: 'es' | 'en'): Promise<VersionConfig[]> {
  // For now, return all versions. In a real scenario, we'd check
  // which version folders exist for each language's collection.
  if (lang === 'en') {
    // English may have fewer versions
    return VERSIONS.filter(v => ['v0-1-0', 'v0-2-0', 'v0-3-0', 'v0-4-0', 'v0-5-0', 'v0-6-0'].includes(v.id));
  }
  return VERSIONS;
}

/** Get the latest version config */
export function getLatestVersion(): VersionConfig {
  return VERSIONS.find(v => v.latest) || VERSIONS[0];
}
