# AGENTS.md

## 1. Project Context

**Project**
API de Gestión e Inventario (Distribuidora B2B Gastronómica)

**Purpose**
Backend ERP/SaaS para centralizar y automatizar el control de ventas, inventario (FEFO), cuentas corrientes y gestión dinámica de precios B2B.

**Stack**
- NestJS
- TypeScript
- PostgreSQL
- Prisma (ORM)
- Docker
- Swagger

*Para información detallada del negocio, consultar "PRD.md".*

---

## 2. Source of Truth

Antes de tomar decisiones, consultar las fuentes en este orden:

1. Código existente.
2. Especificaciones de la tarea actual.
3. "PRD.md" para reglas y contexto de negocio.
4. Documentación oficial de las tecnologías utilizadas.

**Reglas importantes:**
- **No asumir ni inventar requisitos** cuando la información necesaria no está disponible. Si existe una ambigüedad, solicitar aclaración.
- **SIEMPRE revisar la carpeta `src/common`** antes de crear utilidades, excepciones o decoradores nuevos. Reutilizar lo existente es obligatorio.

---

## 3. Project Structure

La aplicación está organizada por módulos de negocio y directorios core.

src/
├── common/
│   ├── decorators/     # Decoradores custom (ej: response-msj)
│   ├── interceptors/   # Interceptores (ej: formateo de respuesta)
│   └── exceptions/
├── generated/
│   └── prisma/         # Cliente Prisma generado y Enums (UserRole, etc.)
├── modules/
│   ├── auth/
│   ├── users/
│   ├── products/
│   ├── inventory/
│   └── orders/
├── config/
└── main.ts


**Reglas:**
- Cada funcionalidad debe pertenecer al módulo correspondiente.
- Evitar colocar lógica de negocio en `main.ts`.
- No crear carpetas o capas nuevas sin una necesidad concreta.

---

## 4. Architecture & Response Rules

La aplicación utiliza una arquitectura modular basada en NestJS con un estándar estricto de respuestas.

**Controllers y Estandarización de Respuestas:**
- Los Controllers **NO** deben contener lógica de negocio compleja.
- **OBLIGATORIO:** Toda respuesta exitosa es formateada por el interceptor global ubicado en `src/common/interceptors`. **No** se deben armar objetos de respuesta manuales como `{ status: 200, data: ... }` en los controllers. Solo se debe retornar el dato bruto (entidad, array, boolean).
- **OBLIGATORIO:** Utilizar el decorador de mensaje en cada endpoint del controller, importado desde `src/common/decorators`. (Ej: `@ResponseMsj('Producto creado exitosamente')`).

**Services:**
- Implementan la lógica de negocio y coordinan operaciones.
- Aplican las reglas del `PRD.md`.

**DTOs:**
- Representan los datos de entrada/salida. No utilizar Entities/Modelos de Prisma como DTOs de entrada.

**Prisma Client y Tipos (`generated/`):**
- **OBLIGATORIO:** Cualquier Enum de base de datos (ej. `UserRole`, `OrderStatus`) o tipo inferido **debe importarse desde** `../src/generated/prisma`. No se deben redeclarar en el código.

---

## 5. Business Logic

Las reglas de negocio deben mantenerse fuera de los Controllers.
Antes de implementar una funcionalidad:
1. Revisar las reglas definidas en "PRD.md".
2. Identificar posibles conflictos con otros módulos.
3. Nunca inventar una regla de negocio para completar una implementación.

---

## 6. Database (Prisma & PostgreSQL)

- **Prisma** es el único ORM utilizado para el acceso a datos.
- El archivo `schema.prisma` es la fuente de verdad absoluta de la base de datos.
- Las migraciones se gestionan con Prisma (`npx prisma migrate dev`). No modificar migraciones SQL generadas manualmente.
- **Data Integrity:** Mantener la consistencia (ej. operaciones financieras/cantidades usan `Decimal`). No permitir datos inconsistentes para simplificar una implementación. Las operaciones multi-tabla críticas (ej. crear pedido) deben usar `$transaction`.

---

## 7. Validation

Toda entrada proveniente del cliente debe ser validada.
- Utilizar `class-validator` y `class-transformer` en los DTOs.
- No confiar en datos enviados por el cliente.

---

## 8. Error Handling

- Utilizar las excepciones HTTP proporcionadas por NestJS (`BadRequestException`, `NotFoundException`, etc.).
- El mensaje de error debe ser claro y específico.
- Mantener compatibilidad con los interceptores/filtros globales definidos en `src/common`.

---

## 9. Authentication & Authorization

- Los endpoints protegidos deben requerir autenticación (Guards).
- La autorización (roles) debe verificarse tomando los Roles desde el cliente de Prisma generado (`src/generated/prisma`).

---

## 10. API Rules

Al modificar un endpoint existente:
- Mantener el contrato actual salvo que la tarea indique lo contrario.
- No cambiar códigos HTTP sin justify.

Al crear un nuevo endpoint:
- Utilizar DTOs.
- Implementar validación.
- **Aplicar el decorador de mensajes** (de `common/decorators`).
- Documentar mediante Swagger.

---

## 11. Coding Conventions

- **Classes:** `PascalCase`
- **Variables/Methods:** `camelCase`
- **Constants:** `UPPER_SNAKE_CASE`
- **Archivos:** convención de NestJS (`name.controller.ts`, `name.service.ts`).
- Evitar duplicación de código.
- Revisar `src/common` antes de crear algo que parezca genérico.

---

## 12. Dependencies

Antes de agregar un paquete npm:
1. Verificar si el proyecto ya posee una solución (ej. herramientas de NestJS/Prisma).
2. Evaluar si realmente es necesaria.
3. Explicar la razón de introducirla.

---

## 13. Git Workflow

**Commits:** Cada commit debe representar un único cambio lógico.
Ejemplos:
- `feat: add product creation dto`
- `feat: add product creation service`
- `feat: add product creation endpoint`
- `fix: validate product stock`

No mezclar funcionalidades diferentes en un mismo commit.

---

## 14. Task Workflow

Antes de comenzar:
1. Leer la especificación y el `PRD.md`.
2. Revisar el código existente (¡especialmente `src/common`!).

Durante la implementación:
1. Mantener el alcance de la tarea.
2. Reutilizar código existente e importaciones de `src/generated/prisma`.
3. No realizar cambios no relacionados.

Después de implementar:
1. Ejecutar lint.
2. Revisar errores de TypeScript.
3. Verificar que no existan archivos innecesarios.

---

## 15. Scope Control

El alcance de la tarea debe respetarse estrictamente. El agente NO debe:
- Modificar módulos no relacionados.
- Cambiar la arquitectura sin necesidad.
- Agregar dependencias innecesarias.
- Inventar reglas de negocio.
- Escribir tests (el proyecto no los utiliza).

---

## 16. Definition of Done

Una tarea se considera terminada cuando:
- [ ] La funcionalidad solicitada está implementada.
- [ ] Se respetan las reglas de negocio del `PRD.md`.
- [ ] Se utilizó el decorador de mensajes en el controller.
- [ ] El controller devuelve los datos crudos (dejando el formato al interceptor global).
- [ ] Los enums y tipos se importaron desde `src/generated/prisma`.
- [ ] TypeScript y Lint no presentan errores.
- [ ] No existen cambios no relacionados.

---

## 17. Final Response

Al finalizar una tarea, informar:
- **Implementado:** Resumen breve de lo realizado.
- **Archivos modificados:** Lista de archivos creados o modificados.
- **Validaciones:** Resultado de verificaciones de TypeScript/Lint.
- **Pendientes:** Problemas, decisiones o tareas que quedaron fuera del alcance.

---

## 18. Important Rules (Resumen Crítico)

1. **NO HAY TESTS:** No escribir, sugerir, ni ejecutar tests en este proyecto.
2. **COMMON FIRST:** Siempre revisar `src/common` antes de implementar excepciones, utilidades o lógicas transversales.
3. **RESPUESTAS DE LA API:** Nunca formatear un JSON a mano en el controller. Retornar el dato directo y usar el decorador de mensajes (`response-msj`); el interceptor hará el resto.
4. **GENERATED:** Utilizar SIEMPRE `src/generated/prisma` para traer enums (`UserRole`, etc.) y tipos de base de datos.
5. **PRISMA:** Respetar `$transaction` para lógica multicapa y tipos `Decimal` para dinero/cantidades.