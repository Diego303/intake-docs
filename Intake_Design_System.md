Sistema de Diseño y Arquitectura Visual: Intake (Dark Blueprint)

Este documento define las reglas de diseño, los tokens visuales y la arquitectura de componentes para el ecosistema web de Intake, utilizando la estética "Dark Blueprint" (Plano Técnico Nocturno).

Esta guía es la base para escalar tanto la landing page promocional como la interfaz interna (SaaS) del producto manteniendo una coherencia visual absoluta.

1. Filosofía de Diseño

El estilo "Dark Blueprint" fusiona la elegancia inmersiva del modo oscuro (Premium Dark) con la precisión analógica del brutalismo arquitectónico.
Simula el entorno de trabajo de un ingeniero: una mesa de dibujo iluminada de noche, planos de AutoCAD impresos, reglas y tinta.

Sensaciones: Precisión milimétrica, solidez estructural, trabajo manual/técnico, claridad absoluta sin distracciones.

Ausencia total de suavidad: Cero bordes redondeados (rounded-none), cero sombras difuminadas (sin blur), cero gradientes decorativos. Todo es sólido y ortogonal.

2. Design Tokens y Fundamentos

2.1. Tipografía

El diseño depende de dos familias tipográficas de Google Fonts, ambas con un carácter geométrico y técnico:

Tipografía Principal (UI y Titulares): Space Grotesk (Sans-serif)

Pesos: 400 (Regular), 600 (Semibold), 700 (Bold), 900 (Black).

Uso: Titulares principales (H1, H2), botones de llamada a la acción, textos de lectura largos. Aporta un toque constructivista y moderno.

Tipografía Secundaria (Técnica y Datos): JetBrains Mono (Monospace)

Pesos: 400 (Regular), 500 (Medium), 700 (Bold).

Uso: Etiquetas de estado, navegación, fragmentos de código, identificadores (Ej. Doc. Ref: INT-001), y elementos del diagrama técnico. Todo el texto secundario debe ir en mayúsculas (uppercase) y con tracking amplio (tracking-widest) para simular etiquetas impresas.

2.2. Paleta de Colores (Variables CSS)

La paleta se gestiona a través de variables CSS nativas inyectadas en :root para mantener la consistencia temática.

Fondos y Superficies:

--blueprint-bg: #050505 (Negro profundo, casi absoluto. Fondo base de la cuadrícula).

--blueprint-paper: #0a0a0a (Superficies elevadas, "hojas" de papel técnico).

Trazos y Textos (Tintas):

--ink-white: #ededed (Blanco tiza. Texto principal y bordes de alto contraste).

--zinc-border: #3f3f46 (Gris técnico medio. Líneas secundarias, bordes de contenedor).

--grid-line: #1f1f22 (Gris casi imperceptible para la cuadrícula de fondo).

Acentos Semánticos:

--brick (Alerta/Atención): #C0392B (Rojo Ladrillo. Usado para problemas, estados de error y llamadas de atención urgentes).

Éxito / Output: #34d399 (Emerald 400. Exclusivo para resultados exitosos y el documento final YAML de Intake).

3. Texturas y Efectos Analógicos (VFX)

Para romper la monotonía digital, se utilizan patrones CSS generados matemáticamente que simulan materiales físicos:

3.1. Cuadrícula Técnica (.blueprint-grid)

Generada mediante linear-gradient sobre el body.

Forma celdas perfectas de 40px x 40px usando el color --grid-line.

Aporta escala y proporción a toda la interfaz, como un tapete de corte.

3.2. Sombreado de Trama (.hatch-pattern-dark)

Patrón de rayas diagonales a 45 grados (repeating-linear-gradient).

Usado para "rellenar" espacios vacíos, cajas negras del motor Intake o zonas de advertencia sin usar colores sólidos que saturen la vista.

3.3. Marcas de Corte (.crop-mark)

Pequeños ángulos de 15x15px con bordes de 2px.

Ubicados en las esquinas (.crop-tl, .crop-tr, etc.) de los contenedores principales (el cajetín superior) para simular los límites de impresión de un documento técnico.

4. Sistema de Componentes (UI Kit)

4.1. Bordes y Contenedores

Todos los contenedores usan bordes gruesos y esquinas afiladas (0px border-radius).

.tech-border: Borde gris técnico estándar de 2px.

.tech-border-white: Borde de alto contraste (blanco).

.tech-border-brick: Borde de acento/alerta.

Líneas Discontinuas: Se permite border-dashed para delinear áreas internas (Ej. "Cajetín de plano").

4.2. Sombras Sólidas (Brutalismo)

En lugar de box-shadow difuminado, se usa un desplazamiento sólido (offset) para crear profundidad mecánica.

.tech-shadow: Desplazamiento 6px 6px 0px 0px var(--zinc-border).

.tech-shadow-brick: Desplazamiento 6px 6px 0px 0px var(--brick).

4.3. Botones e Interacciones (.tech-button)

La interacción no altera opacidades, sino que simula presionar un teclado mecánico físico:

Estado Natural: El botón está elevado (sombra de 6px).

Estado Hover: El botón baja ligeramente (transform: translate(2px, 2px)) y la sombra se reduce a 4px.

Estado Active (Clic): El botón se "hunde" por completo (transform: translate(6px, 6px)) y la sombra desaparece (0px).

4.4. Etiquetas y Metadatos

Uso de cajas inline con bordes, tipografía Monospace pequeña y un indicador visual (Ej. un punto rojo parpadeante animate-pulse junto a "Doc. Ref: INT-001").

5. Estructura de la Landing Page

5.1. El Cajetín Principal (Header)

Actúa como la leyenda de un plano arquitectónico.

Rodeado de marcas de corte (crop marks).

Contenido encapsulado dentro de un área border-dashed con fondo texturizado (hatch-pattern-dark).

Títulos en cajas blancas (bg-[#0a0a0a] inline-block px-4 tech-border-white) superpuestas sobre los patrones.

5.2. El Diagrama de Flujo (Visual Diagram)

Es una pieza de diseño puramente ortogonal, simulando un esquema eléctrico o de tuberías:

Tres Columnas Estrictas: Requisitos (Fase 1), Procesamiento (Fase 2), Ejecución (Fase 3).

Buses de Datos (Líneas verticales): Representan el flujo de información acumulada.

Conectores (SVG): Líneas vectoriales exactas (fill="none" stroke-width="2") que hacen ángulos de 90 grados y usan polígonos (<polygon>) para las flechas de dirección.

Caja Central: El logotipo de Intake encerrado en un área de seguridad cuadriculada, simbolizando la "caja negra".

6. Escalabilidad: Directrices para la Aplicación Interna (SaaS App)

Cuando este diseño se traslade a la herramienta real (Dashboard, Editor YAML, Panel de Control), se deben seguir estas normativas:

6.1. Layout del Dashboard (El "Tablero de Control")

Sidebar Lateral: Fondo #050505, delineada por un .tech-border a la derecha. Los elementos inactivos están en gris text-zinc-500, y el elemento activo usa un bloque sólido con .tech-border-white.

Barra Superior (Status Bar): Debe parecerse a la barra de estado de un IDE (VS Code) o terminal, llena de metadatos útiles (RAM de los agentes, tokens consumidos) en fuente JetBrains Mono.

6.2. Visualización de Datos y Tablas

Tablas de Requisitos: Cero líneas divisorias verticales. Solo gruesas líneas horizontales (border-b-2 border-zinc-800).

Estados de Filtros: Un filtro activo debe verse "presionado" (usando el estado tech-button:active permanentemente).

6.3. Editor de Especificaciones (El Lienzo YAML)

Contenedor: Un bloque masivo con .tech-shadow y borde blanco para indicar el foco principal de la herramienta.

Syntax Highlighting: Muy austero. Solo tres colores:

Llaves y estructura YAML en blanco (#ededed).

Cadenas de texto en gris técnico (zinc-400).

Valores importantes (Tags, booleanos, identificadores de Jira) en color Ladrillo (#C0392B) o Emerald (#34d399) para máxima legibilidad sin aspecto "arcoíris".

6.4. Formularios y Modales (Paneles de Ingesta)

Inputs: Cajas cuadradas, fondo negro (#000000), borde gris.

Focus: Al hacer clic en un input, el borde cambia abruptamente a blanco puro (border-white), sin transiciones de desvanecimiento (0s transition) para enfatizar la rapidez y respuesta mecánica de la aplicación.

Modales: Deben caer desde arriba con una animación rígida y rápida, usando .hatch-pattern-dark detrás del contenido del modal como telón de fondo (backdrop).