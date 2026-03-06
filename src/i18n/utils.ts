import { ui, type Lang } from './ui';

/** Get a nested translation value by dot-notation key */
export function t(key: string, lang: Lang = 'es'): string {
  const keys = key.split('.');
  let value: unknown = ui[lang];
  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = (value as Record<string, unknown>)[k];
    } else {
      // Fallback to Spanish
      value = ui['es'];
      for (const fk of keys) {
        if (value && typeof value === 'object' && fk in value) {
          value = (value as Record<string, unknown>)[fk];
        } else {
          return key;
        }
      }
      break;
    }
  }
  return typeof value === 'string' ? value : key;
}

/** Get an array translation value */
export function tArray(key: string, lang: Lang = 'es'): string[] {
  const keys = key.split('.');
  let value: unknown = ui[lang];
  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = (value as Record<string, unknown>)[k];
    } else {
      return [];
    }
  }
  return Array.isArray(value) ? value as string[] : [];
}

/** Detect language from URL */
export function getLangFromUrl(url: URL): Lang {
  const segments = url.pathname.split('/').filter(Boolean);
  // Account for base path (e.g. /intake/)
  const basePath = 'intake-docs';
  const filtered = segments.filter(s => s !== basePath);
  if (filtered[0] === 'en') return 'en';
  return 'es';
}

/** Generate a localized path */
export function getLocalizedPath(path: string, lang: Lang): string {
  const clean = path.startsWith('/') ? path : `/${path}`;
  if (lang === 'es') return clean;
  return `/en${clean}`;
}

/** Get the alternate language path for the language toggle */
export function getAlternateLangPath(url: URL, targetLang: Lang): string {
  const segments = url.pathname.split('/').filter(Boolean);
  const basePath = 'intake-docs';
  const filtered = segments.filter(s => s !== basePath);

  if (targetLang === 'en') {
    // Current is ES → target EN: add 'en' prefix
    return `/${basePath}/en/${filtered.join('/')}/`;
  } else {
    // Current is EN → target ES: remove 'en' prefix
    const withoutEn = filtered.filter(s => s !== 'en');
    return `/${basePath}/${withoutEn.join('/')}/`;
  }
}
