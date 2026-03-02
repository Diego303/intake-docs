---
title: "Formatos de Entrada"
description: "Los 8 parsers soportados, qué extraen y cómo se auto-detectan."
order: 6
icon: "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8"
---

# Formatos de entrada

intake soporta 8 formatos de entrada a través de parsers especializados. El formato se auto-detecta por extensión de archivo y contenido.

---

## Tabla resumen

| Formato | Parser | Extensiones | Dependencia | Qué extrae |
|---------|--------|-------------|-------------|-----------|
| Markdown | `MarkdownParser` | `.md`, `.markdown` | — | Front matter YAML, secciones por headings |
| Texto plano | `PlaintextParser` | `.txt`, stdin (`-`) | — | Párrafos como secciones |
| YAML / JSON | `YamlInputParser` | `.yaml`, `.yml`, `.json` | — | Claves top-level como secciones |
| PDF | `PdfParser` | `.pdf` | pdfplumber | Texto por página, tablas como Markdown |
| DOCX | `DocxParser` | `.docx` | python-docx | Párrafos, tablas, metadata, secciones por headings |
| Jira | `JiraParser` | `.json` (auto-detectado) | — | Issues, comments, links, labels, prioridad |
| Confluence | `ConfluenceParser` | `.html`, `.htm` (auto-detectado) | bs4, markdownify | Contenido limpio como Markdown |
| Imágenes | `ImageParser` | `.png`, `.jpg`, `.jpeg`, `.webp`, `.gif` | LLM vision | Descripción del contenido visual |

---

## Auto-detección de formato

El registry detecta el formato automáticamente siguiendo este orden:

1. **Stdin** (`-`): siempre se trata como `plaintext`
2. **Extensión del archivo**: mapeo directo (`.md` -> markdown, `.pdf` -> pdf, etc.)
3. **Subtipo JSON**: si la extensión es `.json`:
   - Si tiene key `"issues"` o es una lista con objetos que tienen `"key"` + `"fields"` -> `jira`
   - Si no -> `yaml` (se trata como datos estructurados)
4. **Subtipo HTML**: si la extensión es `.html` o `.htm`:
   - Si los primeros 2000 caracteres contienen "confluence" o "atlassian" -> `confluence`
   - Si no -> fallback a `plaintext`
5. **Fallback**: si no hay parser para el formato detectado -> `plaintext`

---

## Parsers en detalle

### Markdown

**Extensiones:** `.md`, `.markdown`

**Qué extrae:**

- **YAML front matter**: si el archivo empieza con `---`, extrae los metadatos como pares clave-valor
- **Secciones por headings**: cada `#`, `##`, `###`, etc. se convierte en una sección con título, nivel y contenido
- **Texto completo**: el contenido sin el front matter

**Ejemplo de fuente:**

```markdown
---
project: API de Usuarios
version: 2.0
priority: high
---

# Requisitos Funcionales

## FR-01: Registro de usuarios
El sistema debe permitir registro con email y password...

## FR-02: Autenticación
El sistema debe soportar OAuth2 y JWT...
```

**Metadata extraída:** `project`, `version`, `priority` (del front matter)

---

### Texto plano

**Extensiones:** `.txt`, stdin (`-`), archivos sin extensión

**Qué extrae:**

- **Secciones por párrafos**: cada bloque separado por líneas en blanco se convierte en una sección
- **Metadata**: `source_type` ("stdin" o "file")

**Ideal para:**

- Notas rápidas
- Dumps de Slack
- Ideas en bruto
- Texto copiado desde cualquier fuente

**Ejemplo:**

```text
Necesitamos un sistema de notificaciones en tiempo real.
Debe soportar WebSocket para updates inmediatos.

Los usuarios deben poder configurar sus preferencias:
- Email para notificaciones importantes
- Push para updates en tiempo real
- Silenciar por horario
```

---

### YAML / JSON

**Extensiones:** `.yaml`, `.yml`, `.json` (cuando no es Jira)

**Qué extrae:**

- **Secciones por claves top-level**: cada clave de primer nivel se convierte en una sección
- **Texto**: representación YAML del contenido completo
- **Metadata**: `top_level_keys` (cantidad) o `item_count`

**Ejemplo de fuente:**

```yaml
functional_requirements:
  - id: FR-01
    title: User Registration
    description: Users must be able to register...
    priority: high
    acceptance_criteria:
      - Email validation
      - Password strength check

non_functional_requirements:
  - id: NFR-01
    title: API Response Time
    description: All API endpoints must respond in under 200ms
```

---

### PDF

**Extensiones:** `.pdf`
**Requiere:** `pdfplumber`

**Qué extrae:**

- **Texto por página**: cada página se convierte en una sección
- **Tablas**: se convierten a formato Markdown automáticamente
- **Metadata**: `page_count`

**Limitaciones:**

- Solo funciona con PDFs que tienen texto extraíble
- PDFs escaneados (solo imágenes) no son soportados directamente — usar el parser de imágenes en su lugar

---

### DOCX

**Extensiones:** `.docx`
**Requiere:** `python-docx`

**Qué extrae:**

- **Párrafos**: texto de cada párrafo
- **Secciones por headings**: headings de Word se convierten en secciones estructuradas
- **Tablas**: se convierten a formato Markdown
- **Metadata del documento**: autor, título, asunto, fecha de creación

---

### Jira

**Extensiones:** `.json` (auto-detectado por estructura)

Soporta dos formatos de exportación de Jira:

**Formato API REST** (`{"issues": [...]}`):

```json
{
  "issues": [
    {
      "key": "PROJ-001",
      "fields": {
        "summary": "Implementar login",
        "description": "El usuario debe poder...",
        "priority": {"name": "High"},
        "status": {"name": "To Do"},
        "labels": ["auth", "mvp"],
        "comment": {
          "comments": [...]
        },
        "issuelinks": [...]
      }
    }
  ]
}
```

**Formato lista** (`[{"key": "...", "fields": {...}}, ...]`):

```json
[
  {
    "key": "PROJ-001",
    "fields": {
      "summary": "Implementar login",
      "description": "..."
    }
  }
]
```

**Qué extrae por cada issue:**

| Dato | Campo Jira | Límite |
|------|-----------|--------|
| Summary | `fields.summary` | — |
| Description | `fields.description` | — |
| Priority | `fields.priority.name` | — |
| Status | `fields.status.name` | — |
| Labels | `fields.labels` | — |
| Comments | `fields.comment.comments` | Últimos 5, max 500 chars cada uno |
| Issue links | `fields.issuelinks` | Tipo, dirección, target |

**Soporte ADF:** Los comentarios en Atlassian Document Format (JSON anidado) se convierten automáticamente a texto plano.

**Relaciones extraídas:**

- `blocks` / `is blocked by`
- `depends on`
- `relates to`

---

### Confluence

**Extensiones:** `.html`, `.htm` (auto-detectado por contenido)
**Requiere:** `beautifulsoup4`, `markdownify`

**Detección:** Los primeros 2000 caracteres del archivo se inspeccionan buscando "confluence" o "atlassian".

**Qué extrae:**

- **Contenido principal**: busca el div de contenido principal (por id, clase, o rol)
- **Conversión a Markdown**: convierte HTML a Markdown limpio con headings ATX
- **Secciones por headings**: del Markdown resultante
- **Metadata**: título, autor, fecha, descripción (de tags `<meta>`)

**Selectores de contenido** (en orden de prioridad):

1. `div#main-content`
2. `div.wiki-content`
3. `div.confluence-information-macro`
4. `div#content`
5. `div[role=main]`
6. `<body>` (fallback)

---

### Imágenes

**Extensiones:** `.png`, `.jpg`, `.jpeg`, `.webp`, `.gif`
**Requiere:** LLM con capacidad de visión

**Qué hace:**

1. Codifica la imagen en base64
2. Envía al LLM visión con un prompt pidiendo describir:
   - Mockups de UI / wireframes
   - Diagramas de arquitectura
   - Texto visible en la imagen
3. Retorna la descripción como texto

**Metadata:** `image_format`, `file_size_bytes`

**Nota:** Por defecto usa un stub que retorna texto placeholder. La visión real se activa cuando se configura el `LLMAdapter` con un modelo que soporte visión.

---

## Limitaciones generales

| Límite | Valor | Descripción |
|--------|-------|-------------|
| Tamaño máximo | 50 MB | Archivos mayores a 50 MB son rechazados con `FileTooLargeError` |
| Archivos vacíos | Error | Archivos vacíos o solo whitespace producen `EmptySourceError` |
| Encoding | UTF-8 + fallback | Intenta UTF-8 primero, fallback a latin-1 |
| Directorios | Error | Pasar un directorio como fuente produce un error |

---

## Agregar soporte para más formatos

intake usa el patrón `Protocol` para parsers. Para agregar un nuevo parser:

1. Crear un archivo en `src/intake/ingest/` (ej: `asana.py`)
2. Implementar los métodos `can_parse(source: str) -> bool` y `parse(source: str) -> ParsedContent`
3. Registrarlo en `registry.py` dentro de `create_default_registry()`

No es necesario heredar de ninguna clase base — solo implementar la interfaz correcta.
