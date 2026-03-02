---
title: "Configuración"
description: "Todas las opciones de .intake.yaml, presets y variables de entorno."
order: 4
icon: "M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"
---

# Configuración

intake funciona sin configuración — solo necesita una API key de LLM. Para personalizar el comportamiento, se usa un archivo `.intake.yaml` en la raíz del proyecto.

---

## Prioridad de carga

La configuración se carga por capas. Cada capa sobreescribe la anterior:

```
CLI flags  >  .intake.yaml  >  preset  >  defaults
```

1. **Defaults**: valores por defecto en el código
2. **Preset**: si se usa `--preset`, aplica un conjunto predefinido
3. **`.intake.yaml`**: archivo de configuración del proyecto
4. **CLI flags**: las opciones de línea de comandos siempre ganan

---

## Archivo .intake.yaml

Crea un archivo `.intake.yaml` en la raíz de tu proyecto. Ejemplo completo:

```yaml
# Configuración del modelo LLM
llm:
  model: claude-sonnet-4         # Cualquier modelo soportado por LiteLLM
  api_key_env: ANTHROPIC_API_KEY  # Variable de entorno con la API key
  max_cost_per_spec: 0.50         # Presupuesto máximo por spec (USD)
  temperature: 0.2                # 0.0 = determinista, 1.0 = creativo
  max_retries: 3                  # Reintentos en caso de fallo
  timeout: 120                    # Timeout por llamada LLM (segundos)

# Configuración del proyecto
project:
  name: mi-proyecto               # Nombre (auto-detectado si vacío)
  stack: []                       # Stack tecnológico (auto-detectado si vacío)
  language: en                    # Idioma del contenido generado
  conventions: {}                 # Convenciones personalizadas (key: value)

# Configuración de la spec
spec:
  output_dir: ./specs             # Donde guardar las specs generadas
  requirements_format: ears       # ears | user-stories | bdd | free
  design_depth: moderate          # minimal | moderate | detailed
  task_granularity: medium        # coarse | medium | fine
  include_sources: true           # Incluir trazabilidad de fuentes
  version_specs: true             # Crear directorios versionados
  generate_lock: true             # Generar spec.lock.yaml
  risk_assessment: true           # Incluir evaluación de riesgos

# Configuración de verificación
verification:
  auto_generate_tests: true       # Generar checks de aceptación
  test_output_dir: ./tests/generated
  checks: []                      # Checks personalizados adicionales
  timeout_per_check: 120          # Timeout por check (segundos)

# Configuración de exportación
export:
  default_format: generic         # architect | claude-code | cursor | kiro | generic
  architect_include_guardrails: true
  architect_pipeline_template: standard
  claude_code_generate_claude_md: true

# Seguridad
security:
  redact_patterns: []             # Patrones regex a redactar del output
  redact_files:                   # Archivos a nunca incluir
    - "*.env"
    - "*.pem"
    - "*.key"
```

---

## Referencia completa de campos

### Sección `llm`

| Campo | Tipo | Default | Descripción |
|-------|------|---------|-------------|
| `model` | string | `claude-sonnet-4` | Modelo LLM. Cualquier modelo que [LiteLLM](https://docs.litellm.ai/docs/providers) soporte. |
| `api_key_env` | string | `ANTHROPIC_API_KEY` | Nombre de la variable de entorno que contiene la API key. |
| `max_cost_per_spec` | float | `0.50` | Presupuesto máximo por spec en USD. Si se excede, el análisis se detiene. |
| `temperature` | float | `0.2` | Temperatura del modelo. Menor = más determinista. |
| `max_retries` | int | `3` | Número de reintentos ante fallos del LLM. |
| `timeout` | int | `120` | Timeout por llamada LLM en segundos. |

**Modelos soportados:**

| Proveedor | Ejemplos | Variable de entorno |
|-----------|----------|---------------------|
| Anthropic | `claude-sonnet-4`, `claude-opus-4`, `claude-haiku-4-5` | `ANTHROPIC_API_KEY` |
| OpenAI | `gpt-4o`, `gpt-4`, `gpt-3.5-turbo` | `OPENAI_API_KEY` |
| Google | `gemini/gemini-pro`, `gemini/gemini-flash` | `GEMINI_API_KEY` |
| Local | `ollama/llama3`, `ollama/mistral` | (no necesita key) |

### Sección `project`

| Campo | Tipo | Default | Descripción |
|-------|------|---------|-------------|
| `name` | string | `""` | Nombre del proyecto. Si está vacío, se genera desde la descripción del `init`. |
| `stack` | list[string] | `[]` | Stack tecnológico. Si está vacío, se auto-detecta desde archivos del proyecto. |
| `language` | string | `en` | Idioma para el contenido generado (ej: `en`, `es`, `fr`). |
| `conventions` | dict | `{}` | Convenciones del proyecto como pares clave-valor. |

La auto-detección del stack busca 28+ archivos marcadores en el directorio del proyecto:

| Archivo | Stack detectado |
|---------|----------------|
| `package.json` | javascript, node |
| `tsconfig.json` | typescript |
| `pyproject.toml` | python |
| `Cargo.toml` | rust |
| `go.mod` | go |
| `pom.xml` | java, maven |
| `Dockerfile` | docker |
| `next.config.js` | nextjs |
| ... | ... |

Además inspecciona el contenido de `pyproject.toml` y `package.json` para detectar frameworks (fastapi, django, react, vue, etc.).

### Sección `spec`

| Campo | Tipo | Default | Descripción |
|-------|------|---------|-------------|
| `output_dir` | string | `./specs` | Directorio de salida para las specs. |
| `requirements_format` | string | `ears` | Formato de requisitos. Opciones: `ears`, `user-stories`, `bdd`, `free`. |
| `design_depth` | string | `moderate` | Nivel de detalle del diseño. Opciones: `minimal`, `moderate`, `detailed`. |
| `task_granularity` | string | `medium` | Granularidad de las tareas. Opciones: `coarse`, `medium`, `fine`. |
| `include_sources` | bool | `true` | Incluir `sources.md` con trazabilidad requisito-fuente. |
| `version_specs` | bool | `true` | Crear subdirectorios versionados para las specs. |
| `generate_lock` | bool | `true` | Generar `spec.lock.yaml` con hashes y metadata. |
| `risk_assessment` | bool | `true` | Ejecutar evaluación de riesgos (fase adicional del LLM). |

**Formatos de requisitos:**

| Formato | Descripción | Mejor para |
|---------|-------------|-----------|
| `ears` | Easy Approach to Requirements Syntax. Formato estructurado con condiciones. | Especificaciones formales |
| `user-stories` | "Como [rol], quiero [acción] para [beneficio]". | Equipos ágiles |
| `bdd` | Given/When/Then. Behavior-driven development. | Tests de aceptación |
| `free` | Formato libre. Sin estructura impuesta. | Prototipos rápidos |

**Niveles de diseño:**

| Nivel | Descripción |
|-------|-------------|
| `minimal` | Solo componentes principales y decisiones críticas. |
| `moderate` | Componentes, archivos, decisiones técnicas y dependencias. |
| `detailed` | Todo lo anterior más diagramas de interacción, edge cases, consideraciones de performance. |

**Granularidad de tareas:**

| Nivel | Descripción |
|-------|-------------|
| `coarse` | Tareas grandes, pocas. Cada tarea cubre un componente completo. |
| `medium` | Balance entre granularidad y cantidad. |
| `fine` | Tareas pequeñas y atómicas. Cada tarea es ~15-30 minutos de trabajo. |

### Sección `verification`

| Campo | Tipo | Default | Descripción |
|-------|------|---------|-------------|
| `auto_generate_tests` | bool | `true` | Generar checks de aceptación automáticamente desde los requisitos. |
| `test_output_dir` | string | `./tests/generated` | Directorio para tests generados. |
| `checks` | list[string] | `[]` | Checks personalizados adicionales. |
| `timeout_per_check` | int | `120` | Timeout máximo por check individual en segundos. |

### Sección `export`

| Campo | Tipo | Default | Descripción |
|-------|------|---------|-------------|
| `default_format` | string | `generic` | Formato de exportación por defecto. Opciones: `architect`, `claude-code`, `cursor`, `kiro`, `generic`. |
| `architect_include_guardrails` | bool | `true` | Incluir guardrails en pipelines de architect. |
| `architect_pipeline_template` | string | `standard` | Template de pipeline para architect. |
| `claude_code_generate_claude_md` | bool | `true` | Generar CLAUDE.md al exportar para Claude Code. |

### Sección `security`

| Campo | Tipo | Default | Descripción |
|-------|------|---------|-------------|
| `redact_patterns` | list[string] | `[]` | Patrones regex que se eliminarán del contenido generado. |
| `redact_files` | list[string] | `["*.env", "*.pem", "*.key"]` | Patrones glob de archivos que nunca se incluirán. |

---

## Presets

Los presets son configuraciones predefinidas para casos de uso comunes. Se aplican con `--preset`:

```bash
intake init "Mi feature" -s reqs.md --preset minimal
```

### Comparativa

| Campo | `minimal` | `standard` | `enterprise` |
|-------|-----------|------------|--------------|
| **Caso de uso** | Prototipo rápido | Equipos normales | Regulado / crítico |
| `max_cost_per_spec` | $0.10 | $0.50 | $2.00 |
| `temperature` | 0.3 | 0.2 | 0.1 |
| `requirements_format` | `free` | `ears` | `ears` |
| `design_depth` | `minimal` | `moderate` | `detailed` |
| `task_granularity` | `coarse` | `medium` | `fine` |
| `include_sources` | false | true | true |
| `risk_assessment` | false | true | true |
| `generate_lock` | false | true | true |

### Cuándo usar cada preset

- **`minimal`**: Prototipado rápido, ideas exploratorias, un solo desarrollador. Costo bajo, output mínimo.
- **`standard`**: La opción por defecto. Buen balance entre detalle y costo para equipos de 2-5 personas.
- **`enterprise`**: Para equipos grandes, proyectos regulados, o cuando se necesita trazabilidad completa y evaluación de riesgos exhaustiva.

---

## Variables de entorno

intake busca estas variables de entorno para la autenticación con proveedores LLM:

| Variable | Proveedor | Ejemplo |
|----------|-----------|---------|
| `ANTHROPIC_API_KEY` | Anthropic (Claude) | `sk-ant-api03-...` |
| `OPENAI_API_KEY` | OpenAI (GPT) | `sk-...` |

Configura la variable según tu proveedor:

```bash
# Anthropic
export ANTHROPIC_API_KEY=sk-ant-api03-tu-key-aqui

# OpenAI
export OPENAI_API_KEY=sk-tu-key-aqui
```

Si usas un proveedor diferente, configura `llm.api_key_env` en `.intake.yaml`:

```yaml
llm:
  model: gemini/gemini-pro
  api_key_env: GEMINI_API_KEY
```

---

## Generar config automáticamente

Si no tienes `.intake.yaml`, intake usa defaults sensatos. Para crear un archivo de configuración básico:

```bash
intake doctor --fix
```

Esto crea un `.intake.yaml` mínimo que puedes personalizar:

```yaml
# intake configuration
llm:
  model: claude-sonnet-4
  # max_cost_per_spec: 0.50
project:
  name: ""
  language: en
  # stack: []
spec:
  output_dir: ./specs
```
