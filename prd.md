# PRD — API de Gestión para Distribuidora Gastronómica

## 1. Información general
*   **Título:** API de Gestión e Inventario B2B (ERP/SaaS).
*   **Descripción:** Sistema backend desarrollado para administrar el ciclo comercial y operativo de una distribuidora gastronómica, desde la carga de stock hasta la entrega de pedidos.
*   **Objetivo:** Centralizar y automatizar el control de ventas, inventario y cuentas corrientes, garantizando la trazabilidad exacta de la mercadería y protegiendo la rentabilidad.
*   **Problema que resuelve:** Soluciona la venta de productos sin stock real, los errores en la asignación manual de precios por cliente, el despacho de mercadería vencida y la toma de pedidos a clientes que superaron su límite de crédito.

## 2. Contexto del negocio
*   **Cómo funciona el negocio:** La distribuidora adquiere productos perecederos (en lotes con fechas de vencimiento) y los vende al por mayor a negocios gastronómicos. Cada cliente tiene condiciones financieras particulares (límite de crédito) y precios negociados (listas de precios).
*   **Quiénes utilizan el sistema:** Personal interno de la distribuidora. Principalmente operarios de depósito, gerencia administrativa y ejecutivos de cuenta/vendedores.
*   **Qué procesos principales existen:**
    *   Ingreso de mercadería (creación de lotes).
    *   Actualización de listas de precios.
    *   Toma de pedidos (verificación de stock y crédito).
    *   Despacho (salida de depósito).
    *   Cobranza (actualización de estado de pago).

## 3. Roles y permisos
*   **Roles:** Administrador (`ADMIN`) y Vendedor (`SELLER`).
*   **Qué puede hacer cada rol:**
    *   **ADMIN:** Acceso absoluto. Crea usuarios, gestiona todas las listas de precios, asigna límites de crédito, carga lotes físicos al inventario, aprueba y cancela cualquier pedido, y visualiza métricas globales.
    *   **SELLER:** Acceso operativo. Crea clientes, visualiza el catálogo general y stock disponible (sin poder editarlo), consulta el límite de crédito de sus clientes y genera nuevos pedidos. Solo puede ver los pedidos asignados a su ID.

## 4. Módulos
*   **Auth Module:** Gestiona el inicio de sesión y emisión de JWT. No depende de otros módulos de negocio.
*   **Users Module:** CRUD de empleados y vendedores. Utilizado por Auth para validar credenciales.
*   **Customers Module:** Gestión de clientes y sus estados de cuenta. Depende de las tablas `Orders` para el cálculo de deuda flotante y de `PriceList` para la asignación de precios.
*   **Inventory Module:** Catálogo de productos (`Product`) y trazabilidad física (`ProductBatch`). 
*   **Pricing Module:** Gestión exclusiva de `PriceList` y `PriceListItem`.
*   **Orders Module:** El núcleo del sistema. Orquesta la venta. Depende de Customers (crédito), Pricing (costos y precio final) e Inventory (asignación de lotes).

## 5. Reglas de negocio
*   **Precios dinámicos (Pricing):** El precio de venta no existe en el producto. Se calcula cruzando el `Customer.priceListId` con el `productId` en la tabla `PriceListItem`. Si no existe, recae en `Product.basePrice`.
*   **Inmutabilidad del pedido:** Una vez generado un pedido, los valores (`unitPrice`, `unitCost`, `totalAmount`) quedan congelados. Modificaciones futuras en listas de precios o costos no deben alterar el historial.
*   **Control de crédito estricto:** Un pedido no puede guardarse si: *Monto del nuevo pedido + Suma de pedidos históricos PENDING/PARTIALLY_PAID > Customer.creditLimit*.
*   **Inventario FEFO (First-Expire, First-Out):** El stock se descuenta siempre del lote (`ProductBatch`) más próximo a vencer.
*   **División de lotes:** Si un pedido requiere más cantidad de la que tiene el lote más viejo, el sistema debe descontar el disponible de ese lote y tomar el faltante del siguiente lote, registrando cada sustracción en `OrderItemBatchAllocation`.
*   **Precisión Financiera:** Los montos y cantidades SIEMPRE se tratan como `Decimal` en base de datos y código. Nunca usar `Float`.

## 6. Requisitos funcionales

| ID | Título | Descripción | Criterios de aceptación |
| :--- | :--- | :--- | :--- |
| **RF-01** | Autenticación Segura | Login de usuarios del sistema. | Debe emitir Access Token y Refresh Token guardando el hash en BD. |
| **RF-02** | Consulta de Precios | Obtener el precio exacto para un cliente. | Debe devolver el valor de la `PriceList` del cliente, o el `basePrice` si no hay override. |
| **RF-03** | Ingreso de Lotes | Registrar mercadería entrante. | Debe exigir SKU, número de lote, fecha de vencimiento, costo y cantidad. |
| **RF-04** | Creación de Pedido | Flujo central de toma de pedidos. | Debe validar crédito, calcular precios congelados, descontar stock usando FEFO y ejecutarse todo en una única transacción de Prisma. |
| **RF-05** | Actualización de Estados | Mover un pedido en el flujo operativo. | El estado (`OrderStatus`) solo puede avanzar en orden lógico (Pendiente -> Confirmado -> Despachado -> Entregado). |

## 7. Arquitectura y tecnología
*   **Framework:** NestJS
*   **Lenguaje:** TypeScript
*   **Base de datos:** PostgreSQL
*   **ORM:** Prisma (`schema.prisma` ya definido)
*   **Estructura de carpetas:** Arquitectura modular estándar de NestJS (por features). Ej: `src/modules/orders/`, `src/modules/inventory/`. Dentro de cada módulo: `controller`, `service`, `dto`.
*   **Convenciones importantes:** 
    *   Uso exhaustivo de DTOs con `class-validator` y `class-transformer`.
    *   Operaciones multi-tabla (como RF-04) deben usar Prisma `$transaction`.

## 8. Restricciones para la IA
*   **Qué puede modificar:** La estructura de los controladores, servicios, DTOs y lógica de negocio dentro del código TypeScript de NestJS.
*   **Qué no puede modificar:** El archivo `schema.prisma`. Ya está cerrado y no se aceptan nuevas tablas ni cambios en las relaciones a menos que el usuario lo solicite expresamente.
*   **Convenciones:** 
    *   Responder con código limpio, tipado estricto y sin omitir validaciones.
    *   Tratar siempre variables de cantidad o precio utilizando librerías como `decimal.js` (incluida en Prisma) en TypeScript, nunca como números primitivos (`number`).
*   **No agregar dependencias sin justificar:** Utilizar las herramientas nativas de NestJS y Prisma antes de sugerir paquetes externos de npm.
*   **Mantener cambios pequeños:** Entregar respuestas modulares. Si se pide el módulo de órdenes, no generar el módulo de autenticación a menos que se solicite.