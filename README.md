# Buscador de evidencia PICO

Herramienta docente que guía, en seis pasos, desde la **pregunta estructurada** hasta una **estrategia de búsqueda reproducible**: conceptos, vocabulario controlado (MeSH, Emtree, CINAHL, DeCS) y texto libre, traducidos a la sintaxis de cada base de datos y documentados con la lista PRISMA-S. Genera las cadenas de búsqueda; no las ejecuta ni sustituye la revisión por un documentalista.

**Abrir la herramienta:** https://www.cesarsanchezmelendez.es/buscaPICO/

- Marcos de pregunta: PICO y sus variantes (PICO-D, PICOT), PICO diagnóstico, PECO, PICO económico y SPIDER para evidencia cualitativa.
- Bases: PubMed, Ovid MEDLINE, Embase, Cochrane CENTRAL, CINAHL, Scopus, Web of Science, BVS, Epistemonikos y la base de datos INAHTA, además de registros de ensayos (ClinicalTrials.gov, WHO ICTRP, CTIS).
- Filtros y límites: filtro Cochrane de ensayos aleatorizados, exclusión de estudios en animales, fechas e idiomas.
- Cinco casos de práctica, entre ellos el informe real de protonterapia y la válvula mitral transcatéter.
- Funciona en el navegador, sin registro ni cookies. El progreso se guarda solo en el navegador de quien la usa.

Desarrollada para la asignatura *Evaluación de Tecnología Sanitaria* (59728) del Grado en Ingeniería Biomédica, Escuela Politécnica de Cuenca, Universidad de Castilla-La Mancha (Tema 3: revisión de evidencias científicas).

> **Uso orientativo.** La sintaxis generada debe comprobarse en cada plataforma antes de ejecutarla y documentarla. Los términos de vocabulario controlado de los casos de práctica están marcados como «sin comprobar» a propósito: hay que validarlos en el tesauro correspondiente.

## Proponer casos o avisar de errores

Abre una [incidencia (issue)](https://github.com/csmelendez/buscaPICO/issues) con la pregunta, la base de datos y lo que esperabas obtener. También puedes escribir a cesar.sanchez@uclm.es.

## Uso de inteligencia artificial

La herramienta se ha desarrollado con ayuda de un asistente de inteligencia artificial generativa (Claude, de Anthropic) en el código, la interfaz y la redacción de los textos explicativos y de los casos de práctica. La sintaxis de cada base de datos y los filtros se han contrastado con la documentación de cada plataforma y con las fuentes que cita la propia herramienta. El autor ha revisado todo el contenido y es responsable de él. Los términos de vocabulario controlado de los casos siguen marcados como «sin comprobar»: forman parte del ejercicio y deben validarse en el tesauro.

La herramienta no usa inteligencia artificial al funcionar: las cadenas de búsqueda las construye en el navegador un código fijo a partir de los conceptos que introduce el usuario, y son siempre las mismas para los mismos datos.

## Licencias

| Parte | Licencia |
| --- | --- |
| Código (`motor.js`, `app.js`, `index.html`) | [EUPL-1.2](LICENSE) (texto en https://choosealicense.com/licenses/eupl-1.2/) |
| Casos de práctica (`datos.js`) y textos explicativos | [CC BY 4.0](LICENSE-CONTENIDO.txt) |
| Fuentes (`fuentes.css`) | [SIL Open Font License 1.1](LICENSES/OFL-1.1.txt) |
| Logotipo de la UCLM (`logo-uclm.png`) | Marca de la Universidad de Castilla-La Mancha; no incluido en estas licencias |
| Filtros de búsqueda y vocabularios citados | De sus autores (Cochrane, NLM, Elsevier, EBSCO, BIREME), citados en la herramienta |

## Cómo citar

GitHub muestra el botón **Cite this repository** a partir de [`CITATION.cff`](CITATION.cff). Formato breve:

> Sánchez Meléndez, C. (2026). *Buscador de evidencia PICO* [Software]. Universidad de Castilla-La Mancha. https://github.com/csmelendez/buscaPICO

## Estructura

- `index.html`: interfaz y estilos.
- `motor.js`: bases de datos, sintaxis de cada plataforma, filtros y construcción de las estrategias.
- `datos.js`: marcos de pregunta y casos de práctica.
- `app.js`: pasos, estado y lista PRISMA-S.
- `fuentes.css`: fuentes incrustadas, servidas desde este sitio (sin Google Fonts).
- `img/og-buscador-pico.png`: imagen de vista previa para redes sociales.

Forma parte de los recursos docentes abiertos de https://www.cesarsanchezmelendez.es/#recursos-abiertos, junto al [Clasificador de productos sanitarios MDR/IVDR](https://www.cesarsanchezmelendez.es/clasificaMD/).

© 2026 César Sánchez Meléndez.
