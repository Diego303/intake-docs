---
title: "Solución de Problemas"
description: "Errores comunes, diagnóstico y FAQ."
order: 10
icon: "M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01"
---

# Solución de problemas

Guía para diagnosticar y resolver problemas comunes con intake.

---

## intake doctor

El primer paso ante cualquier problema es ejecutar `intake doctor`:

```bash
intake doctor
```

Esto verifica:

| Check | Qué verifica | Auto-fixable |
|-------|-------------|--------------|
| Python version | Python >= 3.12 | No |
| LLM API key | Variable de entorno configurada | No |
| pdfplumber | Paquete instalado | Sí |
| python-docx | Paquete instalado | Sí |
| beautifulsoup4 | Paquete instalado | Sí |
| markdownify | Paquete instalado | Sí |
| litellm | Paquete instalado | Sí |
| jinja2 | Paquete instalado | Sí |
| Config file | `.intake.yaml` válido | Sí |

### Auto-fix

Para corregir automáticamente los problemas que se pueden resolver:

```bash
intake doctor --fix
```

Esto:

- **Instala paquetes faltantes** usando `pip3.12`, `pip3` o `pip` (en ese orden de preferencia)
- **Crea `.intake.yaml`** si no existe, con configuración básica

---

## Errores comunes

### API key no configurada

**Error:**
```
LLM error: Environment variable ANTHROPIC_API_KEY is not set.
  Hint: Set it with: export ANTHROPIC_API_KEY=your-api-key
```

**Solución:**

```bash
# Anthropic
export ANTHROPIC_API_KEY=sk-ant-api03-tu-key-aqui

# OpenAI
export OPENAI_API_KEY=sk-tu-key-aqui
```

Si usas otro proveedor, configura `llm.api_key_env` en `.intake.yaml`:

```yaml
llm:
  model: gemini/gemini-pro
  api_key_env: GEMINI_API_KEY
```

Verifica con:
```bash
intake doctor
```

---

### Archivo no encontrado

**Error:**
```
Failed to parse 'reqs.md': File not found: reqs.md
  Hint: Check that the file exists and the path is correct.
```

**Solución:** Verifica que el path al archivo es correcto. Usa paths relativos al directorio actual o paths absolutos:

```bash
# Relativo
intake init "Feature" -s ./docs/reqs.md

# Absoluto
intake init "Feature" -s /home/user/project/docs/reqs.md
```

---

### Archivo vacío

**Error:**
```
Failed to parse 'empty.md': File is empty or contains only whitespace
  Hint: Provide a file with actual content.
```

**Solución:** El archivo existe pero no tiene contenido útil. Agrega contenido al archivo antes de usarlo como fuente.

---

### Archivo demasiado grande

**Error:**
```
Failed to parse 'huge.pdf': File size 52428800 bytes exceeds limit of 50 MB
  Hint: Split the file into smaller parts or extract the relevant sections.
```

**Solución:** El límite es 50 MB. Opciones:

- Dividir el archivo en partes más pequeñas
- Extraer solo las secciones relevantes
- Si es un PDF, extraer las páginas necesarias con otra herramienta

---

### Formato no soportado

**Error:**
```
Unsupported format: 'xlsx' for source 'data.xlsx'
```

**Solución:** intake no soporta archivos Excel directamente. Opciones:

- Exportar a CSV o JSON desde Excel
- Copiar el contenido a un archivo de texto o Markdown
- Convertir a otro formato soportado (ver [Formatos de entrada](../formatos-entrada/))

---

### Presupuesto excedido

**Error:**
```
LLM error: Accumulated cost $0.5123 exceeds limit of $0.50
  Hint: Increase llm.max_cost_per_spec in your config, or use a cheaper model.
```

**Solución:** El análisis superó el presupuesto configurado. Opciones:

1. **Aumentar el límite:**
   ```yaml
   llm:
     max_cost_per_spec: 1.00
   ```

2. **Usar un modelo más barato:**
   ```bash
   intake init "Feature" -s reqs.md -m gpt-3.5-turbo
   ```

3. **Desactivar evaluación de riesgos** (ahorra ~30%):
   ```yaml
   spec:
     risk_assessment: false
   ```

4. **Usar preset minimal:**
   ```bash
   intake init "Feature" -s reqs.md --preset minimal
   ```

---

### LLM no retorna JSON válido

**Error:**
```
LLM error: LLM did not return valid JSON after 3 attempts
  Hint: Try a different model or simplify the prompt.
```

**Solución:** El modelo no pudo generar JSON válido después de los reintentos configurados. Opciones:

1. **Intentar con otro modelo** — algunos modelos son mejores generando JSON estructurado:
   ```bash
   intake init "Feature" -s reqs.md -m claude-sonnet-4
   ```

2. **Aumentar reintentos:**
   ```yaml
   llm:
     max_retries: 5
   ```

3. **Reducir la temperatura** para output más determinista:
   ```yaml
   llm:
     temperature: 0.1
   ```

4. **Simplificar las fuentes** — textos muy largos o complejos pueden confundir al modelo.

---

### Timeout del LLM

**Error:**
```
LLM failed after 3 attempts: Request timed out
  Hint: Check your API key, network connection, and model name.
```

**Solución:**

1. **Verificar conexión a internet**
2. **Aumentar el timeout:**
   ```yaml
   llm:
     timeout: 300  # 5 minutos
   ```
3. **Verificar que el modelo existe** — nombres incorrectos causan timeout:
   ```yaml
   # Correcto
   llm:
     model: claude-sonnet-4

   # Incorrecto — causará timeout o error
   llm:
     model: claude-sonet-4  # typo
   ```

---

### Error de encoding

Si un archivo tiene encoding no-UTF-8, intake intenta leerlo con fallback a latin-1. Si aún así falla:

**Solución:**

1. Convertir el archivo a UTF-8:
   ```bash
   iconv -f ISO-8859-1 -t UTF-8 archivo.txt > archivo_utf8.txt
   ```

2. O abrir en un editor y guardar como UTF-8.

---

### PDF sin texto extraíble

**Error:**
```
Failed to parse 'scanned.pdf': PDF contains only scanned images, no extractable text
  Hint: Use an image source instead.
```

**Solución:** El PDF contiene imágenes escaneadas, no texto digital. Opciones:

1. Usar OCR externo para extraer el texto primero
2. Exportar las páginas como imágenes y usar el parser de imágenes:
   ```bash
   intake init "Feature" -s pagina1.png -s pagina2.png
   ```

---

### Paquete faltante para parser

**Error:**
```
PDF parsing requires pdfplumber.
  Hint: Install it with: pip install pdfplumber
```

**Solución:**

```bash
# Instalar manualmente
pip install pdfplumber

# O usar doctor --fix para instalar todo lo faltante
intake doctor --fix
```

Paquetes opcionales por parser:

| Parser | Paquete | Instalación |
|--------|---------|-------------|
| PDF | pdfplumber | `pip install pdfplumber` |
| DOCX | python-docx | `pip install python-docx` |
| Confluence | beautifulsoup4, markdownify | `pip install beautifulsoup4 markdownify` |

---

### acceptance.yaml inválido

**Error:**
```
Verification failed: Invalid YAML in acceptance.yaml: ...
  Hint: Check acceptance.yaml syntax.
```

**Solución:** El archivo `acceptance.yaml` tiene errores de sintaxis YAML. Verificar:

- Indentación correcta (usar espacios, no tabs)
- Strings con caracteres especiales entre comillas
- Listas con `-` seguido de espacio

```yaml
# Correcto
checks:
  - id: check-01
    name: "Tests pasan"
    type: command
    command: "python -m pytest tests/ -q"

# Incorrecto — falta espacio después de -
checks:
  -id: check-01
```

---

## FAQ

### ¿Necesito internet para usar intake?

Solo para `intake init` y `intake add` (que requieren llamadas al LLM). Todo lo demás funciona offline:

- `intake verify` — ejecuta checks localmente
- `intake export` — genera archivos localmente
- `intake show` / `intake list` — lee archivos locales
- `intake diff` — compara archivos locales
- `intake doctor` — verifica el entorno local

### ¿Puedo usar modelos locales?

Sí. intake usa LiteLLM, que soporta modelos locales via Ollama, vLLM, y otros:

```yaml
llm:
  model: ollama/llama3
  api_key_env: DUMMY_KEY  # Ollama no necesita key
```

```bash
export DUMMY_KEY=not-needed
intake init "Feature" -s reqs.md
```

### ¿En qué idioma se genera la spec?

Por defecto en inglés (`en`). Se configura con `--lang` o `project.language`:

```bash
intake init "Feature" -s reqs.md --lang es
```

```yaml
project:
  language: es
```

El idioma afecta al contenido generado por el LLM, no a la estructura de los archivos.

### ¿Cuánto cuesta generar una spec?

Depende del modelo, la cantidad de texto, y las opciones habilitadas:

| Escenario | Costo aproximado |
|-----------|------------------|
| Fuente pequeña, preset minimal, Claude Sonnet | ~$0.02-0.05 |
| Fuente mediana, preset standard, Claude Sonnet | ~$0.05-0.15 |
| Múltiples fuentes, preset enterprise, Claude Sonnet | ~$0.15-0.50 |
| GPT-3.5 en vez de Claude | ~50-70% menos |

Usa `intake show` para ver el costo real después de generar.

### ¿Puedo editar las specs generadas?

Sí. Las specs son archivos Markdown y YAML normales. Puedes editarlos manualmente después de generarlos. Sin embargo, si usas `intake add --regenerate`, tus ediciones manuales se sobreescribirán.

### ¿Cómo actualizo una spec con nuevos requisitos?

```bash
# Agregar una fuente nueva
intake add specs/mi-feature/ -s nuevos-reqs.md

# O regenerar todo con la nueva fuente
intake add specs/mi-feature/ -s nuevos-reqs.md --regenerate
```

### ¿Puedo usar intake en CI/CD?

Sí. Ver la sección de [integración CI/CD](../verificacion/#integración-con-cicd) en la guía de verificación.

### ¿Los archivos spec se deben commitear a git?

Sí, es recomendable. Las specs son archivos de texto que se benefician del versionado. Ver [Versionado de specs](../buenas-practicas/#versionado-de-specs).
