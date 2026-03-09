---
title: "Introducción"
description: "Instala intake y genera tu primera spec en minutos."
order: 1
icon: "M13 2L3 14h9l-1 8 10-12h-9l1-8z"
---

# Documentación de intake

> De requisitos en cualquier formato a implementación verificada.

**intake** es una herramienta CLI open-source que transforma requisitos desde múltiples fuentes y formatos (Jira, Confluence, PDFs, Markdown, YAML, imágenes, DOCX, texto libre) en una especificación normalizada y verificable que cualquier agente de IA puede consumir.

```
intake = Requisitos caóticos (N fuentes, N formatos) -> Spec ejecutable -> Cualquier agente IA
```

---

## Requisitos previos

- **Python 3.12+**
- **API key de un proveedor LLM** (Anthropic, OpenAI, Google, etc.)

## Instalación

```bash
pip install intake-ai-cli
```

El comando CLI se llama `intake`:

```bash
intake --version
intake doctor
```

Para desarrollo local:

```bash
git clone https://github.com/Diego303/intake-cli.git
cd intake-cli
pip install -e ".[dev]"
```

---

## Guías

| Documento | Descripción |
|-----------|-------------|
| [Arquitectura](../architecture/) | Arquitectura del sistema, módulos, flujo de datos y decisiones de diseño |
| [Guía CLI](../cli-guide/) | Referencia completa de los 8 comandos con todas sus opciones |
| [Configuración](../configuration/) | Todas las opciones de `.intake.yaml`, presets y variables de entorno |
| [Pipeline](../pipeline/) | Cómo funciona el pipeline de 5 fases en detalle |
| [Formatos de entrada](../input-formats/) | Los 8 parsers soportados, qué extraen y cómo se auto-detectan |
| [Verificación](../verification/) | Motor de checks de aceptación, reporters y CI/CD |
| [Exportación](../export/) | Formatos de exportación para agentes IA |
| [Buenas prácticas](../best-practices/) | Tips, patrones recomendados y cómo sacar el máximo provecho |
| [Solución de problemas](../troubleshooting/) | Errores comunes, diagnóstico y FAQ |

---

## Inicio rápido

```bash
# 1. Verificar que el entorno está listo
intake doctor

# 2. Generar una spec desde un archivo Markdown
intake init "Sistema de autenticación OAuth2" -s requirements.md

# 3. Generar desde múltiples fuentes
intake init "Pasarela de pagos" -s jira.json -s confluence.html -s notas.md

# 4. Verificar la implementación contra la spec
intake verify specs/pasarela-de-pagos/ -p .

# 5. Exportar para un agente específico
intake export specs/pasarela-de-pagos/ -f architect -o output/
```

---

## Los 6 archivos spec

Cada spec generada contiene:

| Archivo | Propósito |
|---------|-----------|
| `requirements.md` | Qué construir. Requisitos funcionales y no funcionales. |
| `design.md` | Cómo construirlo. Arquitectura, interfaces, decisiones técnicas. |
| `tasks.md` | En qué orden. Tareas atómicas con dependencias. |
| `acceptance.yaml` | Cómo verificar. Checks ejecutables: comandos, patrones, archivos. |
| `context.md` | Contexto del proyecto para el agente: stack, convenciones, estado. |
| `sources.md` | Trazabilidad completa: cada requisito mapeado a su fuente original. |

Además se genera `spec.lock.yaml` para reproducibilidad (hashes de fuentes, costos, timestamps).
