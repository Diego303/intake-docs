---
title: "Buenas Prácticas"
description: "Tips, patrones recomendados y cómo sacar el máximo provecho."
order: 9
icon: "M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"
---

# Buenas prácticas

Consejos para sacar el máximo provecho de intake.

---

## Escribir buenas fuentes de requisitos

### Sé específico

El LLM extrae mejor los requisitos cuando las fuentes son claras y específicas.

**Bueno:**
```
El sistema debe permitir registro con email y password.
La password debe tener mínimo 8 caracteres, una mayúscula y un número.
El sistema debe enviar un email de confirmación dentro de 30 segundos.
```

**Malo:**
```
Necesitamos un login bueno y seguro.
```

### Incluye criterios de aceptación

Los criterios de aceptación se traducen directamente en checks verificables:

```markdown
## FR-01: Registro de usuarios

El sistema debe permitir registro con email y password.

### Criterios de aceptación
- Email debe ser único en el sistema
- Password mínimo 8 caracteres
- Se envía email de confirmación en < 30 segundos
- El endpoint retorna 201 en éxito, 409 si el email ya existe
```

### Separa funcional de no funcional

intake distingue entre requisitos funcionales (qué hace el sistema) y no funcionales (cómo lo hace). Sepáralos en las fuentes para mejor extracción:

```markdown
# Requisitos funcionales
- El usuario puede registrarse con email
- El usuario puede hacer login con OAuth2

# Requisitos no funcionales
- Tiempo de respuesta < 200ms para todos los endpoints
- El sistema debe soportar 1000 usuarios concurrentes
- Disponibilidad 99.9%
```

---

## Multi-source: combinar formatos

Una de las fortalezas de intake es combinar múltiples fuentes. Cada fuente aporta información diferente:

```bash
intake init "Mi feature" \
  -s historias-usuario.md \    # Requisitos de negocio (Markdown)
  -s jira-export.json \         # Requisitos técnicos + estado actual (Jira)
  -s notas-reunion.txt \        # Decisiones informales (texto libre)
  -s wireframes.png             # Diseño visual (imagen)
```

### Qué aporta cada formato

| Formato | Mejor para |
|---------|-----------|
| Markdown | Requisitos estructurados, specs formales, documentos de diseño |
| Jira JSON | Estado actual del proyecto, prioridades, links entre issues |
| Texto plano | Notas rápidas, decisiones de reuniones, ideas en bruto |
| YAML | Requisitos ya estructurados con IDs y prioridades |
| Confluence HTML | Documentación existente, RFCs, decisiones de equipo |
| PDF | Specs externas, documentos regulatorios, contratos |
| DOCX | Documentos de Word de stakeholders |
| Imágenes | Wireframes, mockups, diagramas de arquitectura |

### Deduplicación automática

Cuando se combinan fuentes, intake deduplica automáticamente requisitos similares usando similaridad Jaccard (threshold 0.75). Si dos fuentes dicen lo mismo con palabras ligeramente diferentes, solo se conserva la primera ocurrencia.

### Detección de conflictos

intake también detecta conflictos entre fuentes. Por ejemplo, si un documento dice "usar PostgreSQL" y otro dice "usar MongoDB", se reporta como conflicto con una recomendación.

---

## Elegir el preset correcto

| Situación | Preset | Por qué |
|-----------|--------|---------|
| Prototipando una idea | `minimal` | Rápido, barato ($0.10), sin extras |
| Proyecto normal de equipo | `standard` | Balance entre detalle y costo ($0.50) |
| Sistema crítico / regulado | `enterprise` | Máximo detalle, trazabilidad, riesgos ($2.00) |
| Primera vez usando intake | `standard` | Muestra todas las capacidades |

```bash
intake init "Mi feature" -s reqs.md --preset minimal
```

También puedes empezar con `minimal` y cambiar a `standard` cuando lo necesites:

```bash
# Primer intento rápido
intake init "Mi feature" -s reqs.md --preset minimal

# Versión completa
intake init "Mi feature" -s reqs.md --preset standard
```

---

## Gestión de costos

### Entender el costo

Cada `intake init` o `intake add` hace 2-3 llamadas al LLM:

1. **Extracción** — la más costosa, procesa todo el texto de las fuentes
2. **Evaluación de riesgos** — opcional (desactivar con `risk_assessment: false`)
3. **Diseño** — procesa los requisitos extraídos

### Reducir costos

| Estrategia | Cómo | Ahorro |
|------------|------|--------|
| Usar preset `minimal` | `--preset minimal` | ~80% (desactiva riesgos, lock, sources) |
| Desactivar riesgos | `risk_assessment: false` | ~30% (elimina 1 de 3 llamadas LLM) |
| Usar modelo más barato | `--model gpt-3.5-turbo` | Variable, depende del modelo |
| Reducir temperatura | `temperature: 0.1` | No reduce costo pero mejora consistencia |
| Budget enforcement | `max_cost_per_spec: 0.25` | Protege contra sorpresas |

### Monitorear costos

```bash
# Ver el costo de una spec generada
intake show specs/mi-feature/
# Muestra: Cost: $0.0423
```

El costo también se registra en `spec.lock.yaml`:

```yaml
total_cost: 0.0423
```

---

## Versionado de specs

### Specs como código

Las specs generadas son archivos de texto — ideales para versionarlos con git:

```bash
# Generar spec
intake init "Auth system" -s reqs.md

# Commitear
git add specs/auth-system/
git commit -m "Add auth system spec v1"
```

### Comparar versiones

Usa `intake diff` para comparar dos versiones:

```bash
# Después de regenerar con nuevas fuentes
intake diff specs/auth-system-v1/ specs/auth-system-v2/
```

Muestra requisitos, tareas y checks agregados, eliminados y modificados.

### Detectar cambios en fuentes

El `spec.lock.yaml` tiene hashes de las fuentes. Puedes verificar si las fuentes cambiaron:

```bash
intake show specs/mi-feature/
```

---

## Seguridad

### Redactar información sensible

Si tus fuentes contienen información sensible, usa `security.redact_patterns`:

```yaml
security:
  redact_patterns:
    - "sk-[a-zA-Z0-9]{20,}"       # API keys
    - "\\b\\d{4}-\\d{4}-\\d{4}\\b" # Números de tarjeta
    - "password:\\s*\\S+"            # Passwords en configs
```

### Excluir archivos sensibles

Por defecto, intake nunca incluye estos archivos en el output:

```yaml
security:
  redact_files:
    - "*.env"
    - "*.pem"
    - "*.key"
```

Agrega más patrones según tu proyecto:

```yaml
security:
  redact_files:
    - "*.env"
    - "*.pem"
    - "*.key"
    - "credentials.*"
    - "secrets.*"
```

---

## Organización del proyecto

### Estructura recomendada

```
mi-proyecto/
├── .intake.yaml              # Configuración de intake
├── specs/                    # Specs generadas
│   ├── auth-system/          #   Spec 1
│   │   ├── requirements.md
│   │   ├── design.md
│   │   ├── tasks.md
│   │   ├── acceptance.yaml
│   │   ├── context.md
│   │   ├── sources.md
│   │   └── spec.lock.yaml
│   └── payments/             #   Spec 2
│       └── ...
├── docs/                     # Fuentes de requisitos
│   ├── requirements.md
│   ├── jira-export.json
│   └── meeting-notes.txt
├── src/                      # Código fuente
└── tests/                    # Tests
```

### Un spec por feature

Genera una spec por cada feature o componente independiente:

```bash
intake init "Auth system" -s docs/auth-reqs.md
intake init "Payments" -s docs/payment-stories.md -s docs/jira-payments.json
intake init "Notifications" -s docs/notif-ideas.txt
```

Esto permite:

- Verificar cada feature independientemente
- Comparar versiones de una feature específica
- Asignar features a diferentes equipos o agentes

---

## Workflow recomendado

```
1. Recopilar requisitos (cualquier formato)
           |
2. intake init "Feature" -s fuente1 -s fuente2
           |
3. Revisar la spec generada
   - requirements.md: ¿requisitos completos?
   - tasks.md: ¿tareas razonables?
   - acceptance.yaml: ¿checks verificables?
           |
4. Iterar si es necesario
   - intake add specs/feature/ -s nueva-fuente.md --regenerate
           |
5. Implementar (manualmente o con agente IA)
   - intake export specs/feature/ -f architect
           |
6. Verificar
   - intake verify specs/feature/ -p .
           |
7. Iterar hasta que todos los checks pasen
```
