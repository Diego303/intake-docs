---
title: "Introducción"
description: "Instala intake y genera tu primera spec en minutos."
order: 1
icon: "M13 2L3 14h9l-1 8 10-12h-9l1-8z"
---

# Documentacion de intake

> De requisitos en cualquier formato a implementacion verificada.

**intake** es una herramienta CLI open-source que transforma requisitos desde multiples fuentes y formatos (Jira, Confluence, PDFs, Markdown, YAML, imagenes, DOCX, texto libre) en una especificacion normalizada y verificable que cualquier agente de IA puede consumir.

```
intake = Requisitos caoticos (N fuentes, N formatos) -> Spec ejecutable -> Cualquier agente IA
```

---

## Requisitos previos

- **Python 3.12+**
- **API key de un proveedor LLM** (Anthropic, OpenAI, Google, etc.)

## Instalacion

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

## Guias

| Documento | Descripcion |
|-----------|-------------|
**Core:**

| Documento | Descripcion |
|-----------|-------------|
| [Arquitectura](../architecture/) | Arquitectura del sistema, modulos, flujo de datos y decisiones de diseno |
| [Guia CLI](../cli-guide/) | Referencia completa de los 19 comandos/subcomandos con todas sus opciones |
| [Configuracion](../configuration/) | Todas las opciones de `.intake.yaml`, presets y variables de entorno |

**Pipeline:**

| Documento | Descripcion |
|-----------|-------------|
| [Pipeline](../pipeline/) | Como funciona el pipeline de 5 fases + feedback loop en detalle |
| [Formatos de entrada](../input-formats/) | Los 11 parsers + 3 conectores API, que extraen y como se auto-detectan |
| [Conectores](../connectors/) | Conectores API directos: Jira, Confluence, GitHub |
| [Plugins](../plugins/) | Sistema de plugins: protocolos, descubrimiento, hooks y como crear plugins |
| [Verificacion](../verification/) | Motor de checks de aceptacion, reporters y CI/CD |
| [Exportacion](../export/) | 6 formatos de exportacion para agentes IA |
| [Feedback](../feedback/) | Feedback loop: analisis de fallos y enmiendas a la spec |
| [MCP Server](../mcp-server/) | Servidor MCP para agentes IA: tools, resources, prompts y transportes |
| [Watch Mode](../watch-mode/) | Modo watch: monitoreo de archivos y re-verificacion automatica |

**Operaciones y enterprise:**

| Documento | Descripcion |
|-----------|-------------|
| [Despliegue](../deployment/) | Docker, pre-commit hooks y patrones de despliegue para equipos |
| [Integracion CI/CD](../ci-cd-integration/) | GitHub Actions, GitLab CI, Jenkins, Azure DevOps |
| [Seguridad](../security/) | Modelo de amenazas, gestion de secretos, redaccion, cumplimiento |
| [Flujos de trabajo](../workflows/) | Patrones para equipos de todos los tamanos: individual a empresa |

**Referencia:**

| Documento | Descripcion |
|-----------|-------------|
| [Buenas practicas](../best-practices/) | Tips, patrones recomendados y como sacar el maximo provecho |
| [Solucion de problemas](../troubleshooting/) | Errores comunes, diagnostico y FAQ |

---

## Inicio rapido

```bash
# 1. Verificar que el entorno esta listo
intake doctor

# 2. Generar una spec desde un archivo Markdown
intake init "Sistema de autenticacion OAuth2" -s requirements.md

# 3. Generar desde multiples fuentes
intake init "Pasarela de pagos" -s jira.json -s confluence.html -s notas.md

# 4. Modo rapido para tareas simples (solo context.md + tasks.md)
intake init "Fix login bug" -s notas.txt --mode quick

# 5. Desde una URL
intake init "API review" -s https://wiki.company.com/rfc/auth

# 6. Verificar la implementacion contra la spec
intake verify specs/pasarela-de-pagos/ -p .

# 7. Exportar para un agente especifico
intake export specs/pasarela-de-pagos/ -f claude-code -o .
intake export specs/pasarela-de-pagos/ -f cursor -o .
intake export specs/pasarela-de-pagos/ -f copilot -o .

# 8. Desde conectores API directos (requiere config)
intake init "Sprint tasks" -s jira://PROJ/sprint/42
intake init "RFC review" -s confluence://ENG/Architecture-RFC

# 9. Feedback loop: analizar fallos y sugerir correcciones
intake feedback specs/pasarela-de-pagos/ -p .

# 10. Gestionar plugins
intake plugins list

# 11. Seguimiento de tareas
intake task list specs/pasarela-de-pagos/
intake task update specs/pasarela-de-pagos/ 1 done --note "Implementado"

# 12. Servidor MCP para agentes IA
intake mcp serve --transport stdio

# 13. Watch mode: re-verificar al cambiar archivos
intake watch specs/pasarela-de-pagos/ --project-dir . --verbose
```

---

## Los 6 archivos spec

Cada spec generada contiene:

| Archivo | Proposito |
|---------|-----------|
| `requirements.md` | Que construir. Requisitos funcionales y no funcionales. |
| `design.md` | Como construirlo. Arquitectura, interfaces, decisiones tecnicas. |
| `tasks.md` | En que orden. Tareas atomicas con dependencias. |
| `acceptance.yaml` | Como verificar. Checks ejecutables: comandos, patrones, archivos. |
| `context.md` | Contexto del proyecto para el agente: stack, convenciones, estado. |
| `sources.md` | Trazabilidad completa: cada requisito mapeado a su fuente original. |

Ademas se genera `spec.lock.yaml` para reproducibilidad (hashes de fuentes, costos, timestamps).