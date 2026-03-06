---
title: "Guía CLI"
description: "Referencia completa de los 8 comandos con todas sus opciones."
order: 3
icon: "M4 17l6-6-6-6M12 19h8"
---

# Guía CLI

intake proporciona 8 comandos. Todos siguen el patrón:

```bash
intake <comando> [argumentos] [opciones]
```

Para ver la ayuda de cualquier comando:

```bash
intake --help
intake <comando> --help
```

---

## intake init

Genera una spec completa a partir de fuentes de requisitos. Este es el comando principal.

```bash
intake init <DESCRIPCION> -s <fuente> [opciones]
```

### Argumento

| Argumento | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `DESCRIPCION` | texto | Sí | Frase corta describiendo qué construir. Se convierte en slug para el nombre del directorio (max 50 caracteres). |

### Opciones

| Flag | Corto | Tipo | Default | Requerido | Descripción |
|------|-------|------|---------|-----------|-------------|
| `--source` | `-s` | texto | — | Sí | Fuente de requisitos (repetible). Path a archivo o `-` para stdin. |
| `--model` | `-m` | texto | config o `claude-sonnet-4` | No | Modelo LLM a usar para el análisis. |
| `--lang` | `-l` | texto | config o `en` | No | Idioma del contenido generado en la spec. |
| `--project-dir` | `-p` | path | `.` | No | Directorio del proyecto existente (para auto-detección del stack). |
| `--stack` | | texto | auto-detectado | No | Stack tecnológico. Ej: `python,fastapi,postgresql`. |
| `--output` | `-o` | path | `./specs` | No | Directorio de salida para la spec. |
| `--format` | `-f` | opción | config o ninguno | No | Formato de exportación: `architect`, `claude-code`, `cursor`, `kiro`, `generic`. |
| `--preset` | | opción | ninguno | No | Preset de configuración: `minimal`, `standard`, `enterprise`. |
| `--interactive` | `-i` | flag | false | No | Modo interactivo: pregunta antes de generar cada sección. |
| `--dry-run` | | flag | false | No | Muestra qué haría sin generar archivos. |
| `--verbose` | `-v` | flag | false | No | Output detallado. |

### Ejemplos

```bash
# Desde un archivo Markdown
intake init "API de usuarios" -s requirements.md

# Desde múltiples fuentes
intake init "Pasarela de pagos" -s jira.json -s confluence.html -s notas.md

# Con modelo específico y preset enterprise
intake init "Sistema crítico" -s reqs.yaml --model gpt-4o --preset enterprise

# Con stack manual y formato de exportación
intake init "Microservicio" -s reqs.md --stack python,fastapi -f architect

# Spec en español
intake init "Carrito de compras" -s historias.md --lang es

# Dry run para ver qué haría
intake init "Prototipo" -s ideas.txt --dry-run

# Desde stdin
cat requisitos.txt | intake init "Feature X" -s -
```

### Qué hace internamente

1. Carga la configuración (preset + `.intake.yaml` + flags CLI)
2. Auto-detecta el stack tecnológico del proyecto (si no se especifica `--stack`)
3. Slugifica la descripción para el nombre del directorio
4. **Fase 1 — Ingest**: parsea todas las fuentes via el registry
5. **Fase 2 — Analyze**: extracción LLM, deduplicación, validación, riesgos, diseño
6. **Fase 3 — Generate**: renderiza 6 templates + `spec.lock.yaml`
7. **Fase 5 — Export**: exporta al formato elegido (si se especificó `--format`)

---

## intake add

Agrega fuentes a una spec existente.

```bash
intake add <SPEC_DIR> -s <fuente> [opciones]
```

### Argumento

| Argumento | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `SPEC_DIR` | path | Sí | Directorio de la spec existente. |

### Opciones

| Flag | Corto | Tipo | Default | Descripción |
|------|-------|------|---------|-------------|
| `--source` | `-s` | texto | — | Nuevas fuentes a agregar (repetible). |
| `--regenerate` | | flag | false | Regenerar toda la spec incluyendo las nuevas fuentes. |
| `--verbose` | `-v` | flag | false | Output detallado. |

### Ejemplo

```bash
# Agregar una fuente nueva a una spec existente
intake add specs/api-de-usuarios/ -s feedback-qa.md

# Agregar y regenerar todo
intake add specs/api-de-usuarios/ -s nuevos-reqs.yaml --regenerate
```

---

## intake verify

Verifica que la implementación cumple con la spec ejecutando los checks de `acceptance.yaml`.

```bash
intake verify <SPEC_DIR> [opciones]
```

### Argumento

| Argumento | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `SPEC_DIR` | path | Sí | Directorio de la spec. |

### Opciones

| Flag | Corto | Tipo | Default | Descripción |
|------|-------|------|---------|-------------|
| `--project-dir` | `-p` | path | `.` | Directorio del proyecto a verificar. |
| `--format` | `-f` | opción | `terminal` | Formato del reporte: `terminal`, `json`, `junit`. |
| `--tags` | `-t` | texto | todos | Solo ejecutar checks con estos tags (repetible). |
| `--fail-fast` | | flag | false | Detenerse en el primer check requerido que falle. |

### Exit codes

| Código | Significado |
|--------|-------------|
| `0` | Todos los checks requeridos pasaron |
| `1` | Al menos un check requerido falló |
| `2` | Error de ejecución (spec no encontrada, YAML inválido, etc.) |

### Ejemplos

```bash
# Verificar con reporte en terminal
intake verify specs/api-de-usuarios/ -p .

# Solo checks con tag "api"
intake verify specs/api-de-usuarios/ -p . -t api

# Formato JUnit para CI
intake verify specs/api-de-usuarios/ -p . -f junit > test-results.xml

# Fail fast
intake verify specs/api-de-usuarios/ -p . --fail-fast

# Formato JSON
intake verify specs/api-de-usuarios/ -p . -f json
```

---

## intake export

Exporta una spec a un formato listo para un agente IA.

```bash
intake export <SPEC_DIR> -f <formato> [opciones]
```

### Argumento

| Argumento | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `SPEC_DIR` | path | Sí | Directorio de la spec. |

### Opciones

| Flag | Corto | Tipo | Default | Descripción |
|------|-------|------|---------|-------------|
| `--format` | `-f` | opción | — | Formato: `architect`, `claude-code`, `cursor`, `kiro`, `generic`. Requerido. |
| `--output` | `-o` | path | `.` | Directorio de salida. |

### Ejemplos

```bash
# Exportar para architect
intake export specs/api-de-usuarios/ -f architect -o output/

# Exportar formato genérico
intake export specs/api-de-usuarios/ -f generic -o output/
```

---

## intake show

Muestra un resumen de una spec: requisitos, tareas, checks, costos.

```bash
intake show <SPEC_DIR>
```

### Argumento

| Argumento | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `SPEC_DIR` | path | Sí | Directorio de la spec. |

### Qué muestra

- Archivos en la spec
- Modelo LLM usado
- Cantidad de requisitos
- Cantidad de tareas
- Costo total del análisis
- Fecha de creación
- Cantidad de fuentes
- Cantidad de checks de aceptación

### Ejemplo

```bash
intake show specs/api-de-usuarios/
```

---

## intake list

Lista todas las specs en un directorio.

```bash
intake list [opciones]
```

### Opciones

| Flag | Corto | Tipo | Default | Descripción |
|------|-------|------|---------|-------------|
| `--dir` | `-d` | path | `./specs` | Directorio donde buscar specs. |

Detecta subdirectorios que contengan `requirements.md` o `acceptance.yaml`.

### Ejemplo

```bash
# Listar specs en el directorio por defecto
intake list

# Listar specs en otro directorio
intake list -d ./mi-proyecto/specs
```

---

## intake diff

Compara dos versiones de una spec y muestra los cambios.

```bash
intake diff <SPEC_A> <SPEC_B> [opciones]
```

### Argumentos

| Argumento | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `SPEC_A` | path | Sí | Primera versión de la spec. |
| `SPEC_B` | path | Sí | Segunda versión de la spec. |

### Opciones

| Flag | Tipo | Default | Descripción |
|------|------|---------|-------------|
| `--section` | opción | `all` | Qué sección comparar: `requirements`, `design`, `tasks`, `acceptance`, `all`. |

### Qué compara

- **requirements**: Requisitos por ID (FR-XX, NFR-XX)
- **tasks**: Tareas por número
- **acceptance**: Checks por ID

Los cambios se muestran como:
- **Added** (verde): elementos nuevos en SPEC_B
- **Removed** (rojo): elementos que estaban en SPEC_A pero no en SPEC_B
- **Modified** (amarillo): elementos con cambios

### Ejemplo

```bash
# Comparar dos versiones completas
intake diff specs/v1/ specs/v2/

# Solo comparar requisitos
intake diff specs/v1/ specs/v2/ --section requirements
```

---

## intake doctor

Diagnostica el entorno y la configuración.

```bash
intake doctor [opciones]
```

### Opciones

| Flag | Corto | Tipo | Default | Descripción |
|------|-------|------|---------|-------------|
| `--fix` | | flag | false | Intentar corregir los problemas detectados automáticamente. |
| `--verbose` | `-v` | flag | false | Output detallado. |

### Checks que ejecuta

| Check | Qué verifica | Auto-fixable |
|-------|-------------|--------------|
| Python version | Python >= 3.12 | No |
| LLM API key | `ANTHROPIC_API_KEY` o `OPENAI_API_KEY` definida | No |
| pdfplumber | Paquete instalado | Sí |
| python-docx | Paquete instalado | Sí |
| beautifulsoup4 | Paquete instalado | Sí |
| markdownify | Paquete instalado | Sí |
| litellm | Paquete instalado | Sí |
| jinja2 | Paquete instalado | Sí |
| Config file | `.intake.yaml` existe y es YAML válido | Sí (crea uno básico) |

### --fix

Con `--fix`, intake intenta corregir automáticamente:

- **Paquetes faltantes**: ejecuta `pip install <paquete>` (detecta `pip3.12`, `pip3` o `pip`)
- **Config faltante**: crea un `.intake.yaml` básico con defaults

### Ejemplos

```bash
# Solo diagnosticar
intake doctor

# Diagnosticar y corregir
intake doctor --fix

# Con output detallado
intake doctor -v
```

---

## Opciones globales

| Flag | Descripción |
|------|-------------|
| `--version` | Muestra la versión de intake |
| `--help` | Muestra la ayuda del comando |

```bash
intake --version    # intake, version 0.1.0
intake --help       # Ayuda general
intake init --help  # Ayuda del comando init
```

---

## Exit codes

Todos los comandos siguen un esquema de exit codes consistente:

| Código | Significado |
|--------|-------------|
| `0` | Éxito |
| `1` | Check requerido falló (solo `verify`) |
| `2` | Error de ejecución |
