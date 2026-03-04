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

/** Semantic route mappings between languages (ES → EN) */
const routeMap: Record<string, string> = {
  'docs': 'docs',
  'introduccion': 'introduction',
  'arquitectura': 'architecture',
  'guia-cli': 'cli-guide',
  'configuracion': 'configuration',
  'formatos-entrada': 'input-formats',
  'verificacion': 'verification',
  'exportacion': 'export',
  'buenas-practicas': 'best-practices',
  'solucion-problemas': 'troubleshooting',
  'conectores': 'connectors',
  'feedback': 'feedback',
  'flujos-trabajo': 'workflows',
  'integracion-cicd': 'ci-cd-integration',
  'despliegue': 'deployment',
  'seguridad': 'security',
  'pipeline': 'pipeline',
  'plugins': 'plugins',
};

const reverseRouteMap: Record<string, string> = Object.fromEntries(
  Object.entries(routeMap).map(([k, v]) => [v, k])
);

/** Get the alternate language path for the language toggle */
export function getAlternateLangPath(url: URL, targetLang: Lang): string {
  const segments = url.pathname.split('/').filter(Boolean);
  const basePath = 'intake-docs';
  const filtered = segments.filter(s => s !== basePath);

  if (targetLang === 'en') {
    // Current is ES → target EN
    const mapped = filtered.map(s => routeMap[s] || s);
    return `/${basePath}/en/${mapped.join('/')}` || `/${basePath}/en/`;
  } else {
    // Current is EN → target ES, remove 'en' prefix
    const withoutEn = filtered.filter(s => s !== 'en');
    const mapped = withoutEn.map(s => reverseRouteMap[s] || s);
    return `/${basePath}/${mapped.join('/')}` || `/${basePath}/`;
  }
}
