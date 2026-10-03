# ROADMAP DE IMPLEMENTACIÓN: TIENDADELKI

**Estado Actual:** Fase 4 Finalizada (Motor de Inventario y Venta Física Rápida)  
**Enfoque de Ejecución:** Modular, incremental y guiado por calidad de producción.  
**Control de Fases:** Cada fase requiere validación y aprobación antes de proceder a la siguiente.

---

## RESUMEN DE FASES

| Fase | Título | Objetivo Clave | Estado |
| :---: | :--- | :--- | :---: |
| **Fase 1** | **Diseño y Arquitectura** | Especificar requerimientos, arquitectura, base de datos y roadmap. | **COMPLETADO** |
| **Fase 2** | **Cimientos del Proyecto y Base de Datos** | Inicializar Next.js + TS, configurar Prisma, conexión PostgreSQL, migraciones, seed y API funcional. | **COMPLETADO** |
| **Fase 3** | **Catálogo y Pipeline de Imágenes** | Gestión de productos simples/variantes, categorías y optimización de medios con Sharp/Storage. | **COMPLETADO** |
| **Fase 4** | **Motor de Inventario y Venta Física Rápida** | Transacciones atómicas de stock, bitácora de movimientos y acción "Vendido Físicamente". | **COMPLETADO** |
| **Fase 5** | **Storefront Público (Tienda Web)** | Interfaz Mobile-First completa: Inicio, Catálogo, Categorías, Producto, Carrito, Checkout, Confirmación, Contacto, Nuestra Tienda, FAQ, Políticas y SEO. | **COMPLETADO** |
| **Fase 6** | **Panel de Administración y Control Operativo** | Gestión de pedidos online, visor de comprobantes (aprobar/rechazar), transportistas y configuraciones. | *Siguiente* |
| **Fase 7** | **Seguridad Avanzada, Backups y Auditoría** | Scripts de respaldo PostgreSQL, rate limiting en checkout y hardening final. | *Planificado* |
| **Fase 8** | **Expansión a Marketplace (Futuro)** | Habilitación de múltiples vendedores sobre la estructura modular creada. | *Futuro* |

---

## DETALLE DE CADA FASE

### FASE 1: ARQUITECTURA Y MODELADO DE DATOS (ESTADO: COMPLETADA)
* **Entregables:**
  * `ARCHITECTURE.md`: Especificación técnica del sistema, decisiones de diseño y reglas de negocio.
  * `DATABASE.md`: Modelo relacional detallado, diagrama ERD, tipos de datos, restricciones e índices.
  * `ROADMAP.md`: Planificación fase por fase.

---

### FASE 2: CIMIENTOS DEL PROYECTO, BASE DE DATOS Y ENTORNO (ESTADO: COMPLETADA)
* **Hitos Implementados y Verificados:**
  * ✅ Estructura de carpetas modular por capas de dominio, infraestructura, presentación y estilos.
  * ✅ Configuración de Next.js 15+ con TypeScript estricto, CSS Tokens y diseño responsivo.
  * ✅ Instalación, configuración y conexión a **PostgreSQL 16** (`tiendadelki_dev` en `127.0.0.1:5432`).
  * ✅ Definición completa del esquema relacional en Prisma (`prisma/schema.prisma`) con todas las entidades.
  * ✅ Ejecución de migraciones declarativas (`20260906013042_init`) y check constraints de motor (`CHECK stock >= 0`).
  * ✅ Script de sembrado ejecutado (`prisma/seed.ts`): tienda matriz, usuarios administrativos, cliente, categorías jerárquicas, productos de ropa con variantes, productos simples de hogar, métodos de envío dinámicos y cuentas bancarias.
  * ✅ Sistema de validación de variables de entorno con Zod (`src/config/env.ts`, `.env.example`, `.env`).
  * ✅ Manejo estandarizado de excepciones HTTP y Zod con códigos tipados (`src/lib/errors.ts`).
  * ✅ Logging estructurado con timestamp y niveles (`src/lib/logger.ts`).
  * ✅ Endpoints de API operativos y probados:
    * `GET /api/health`: Chequeo de salud del servidor y latencia de PostgreSQL.
    * `GET /api/products`: Catálogo con variantes, filtros e imágenes.
    * `GET /api/categories`: Categorías jerárquicas con conteo de ítems.
    * `POST /api/inventory/quick-sale`: Acción rápida "Vendido Físicamente" (atómica, sin órdenes fantasma).
    * `GET /api/inventory`: Bitácora inmutable de movimientos.
    * `POST /api/orders` & `GET /api/orders`: Pedidos con Zero-Trust Pricing y snapshots.
    * `GET /api/settings`: Parámetros públicos del comercio.
  * ✅ Compilación para producción (`next build`) y arranque desde cero verificados con éxito.
  * ✅ **Sistema de Autenticación y Seguridad Implementado (Fase 2.5):**
    * Hashing seguro con Bcrypt (cost 12) sin contraseñas en texto plano (`src/core/auth/password.ts`).
    * Tokens JWT firmados criptográficamente y sesiones seguras en cookies HttpOnly, SameSite=Lax (`src/core/auth/jwt.ts`).
    * Middleware de protección de rutas y autorización estricta (`src/middleware.ts`):
      * Distinción estricta de roles: `ADMIN` (`SUPER_ADMIN`, `ADMIN`, `STAFF`) vs `CLIENTE` (`CUSTOMER`).
      * Manejo y redirección por expiración de sesión.
      * Propagación de cabeceras de identidad seguras (`x-user-id`, `x-user-role`).
    * Protección contra ataques de fuerza bruta (Rate Limiter en memoria para intentos abusivos de login).
    * Configuración de cabeceras de seguridad estrictas (HSTS, CSP, X-Frame-Options: DENY, X-Content-Type-Options: nosniff, Referrer-Policy).
    * Configuración de reglas CORS con credenciales para Next.js API.
    * Endpoints de autenticación implementados:
      * `POST /api/auth/login` (rate limiting, verificación timing-safe, cookie HttpOnly).
      * `POST /api/auth/logout` (invalidación segura de cookie).
      * `GET /api/auth/me` (consulta de perfil autenticado).
      * `GET /api/admin/dashboard-stats` (endpoint protegido para administradores).
    * Interfaces operativas: `/admin/login` y `/admin/dashboard`.
    * Sembrado seguro del administrador inicial con variables configurables (`INITIAL_ADMIN_EMAIL`, `INITIAL_ADMIN_PASSWORD`) sin secretos expuestos.
    * Suite de pruebas ejecutada con 100% de éxito:
      * Unitarias & Criptografía: `test:auth` (7/7 superadas).
      * End-to-End HTTP: `test:e2e:auth` (10/10 superadas).

---

### FASE 3: CATÁLOGO DE PRODUCTOS Y PIPELINE DE IMÁGENES (ESTADO: COMPLETADA)
* **Hitos Implementados y Verificados:**
  * ✅ **Categorías (CRUD Completo):**
    * Operaciones completas: crear, editar, archivar, activar/desactivar, reordenar (`sortOrder`), slugs autogenerados con validación regex, e imagen opcional.
    * Soporte jerárquico padre/hijo con protección contra auto-paternidad cíclica.
    * Protección de integridad: prevención de borrado accidental si la categoría tiene productos asignados.
    * Endpoints REST: `GET /api/categories`, `POST /api/categories`, `GET /api/categories/[id]`, `PUT /api/categories/[id]`, `DELETE /api/categories/[id]`.
  * ✅ **Productos (CRUD Completo):**
    * Modelo exhaustivo: nombre, slug único, descripción, descripción corta (`shortDescription`, max 300 caracteres), categoría, marca opcional, precio base, precio anterior (`compareAtPrice`), costo (`costPrice`), SKU único, stock, stock mínimo, estado (`PUBLISHED`, `DRAFT`, `ARCHIVED`), destacados (`isFeatured`), nuevos (`isNew`), SEO (`seoTitle`, `seoDescription`) e imágenes asociadas.
    * Transacciones atómicas de creación (`prisma.$transaction`) con registro automático del movimiento de inventario inicial (`ENTRADA`).
    * Endpoints REST: `GET /api/products` (búsqueda y filtros), `POST /api/products`, `GET /api/products/[id]`, `PUT /api/products/[id]`, `DELETE /api/products/[id]`.
  * ✅ **Variantes Flexibles Multidimensionales:**
    * Soporte para productos simples sin variantes y productos con variantes de cualquier dimensión (ej. Color + Talla, o Color + Talla + Material, etc.).
    * Cada variante cuenta con: SKU único, código de barras opcional, precio individual, stock independiente, stock mínimo y estado activo.
    * Validaciones robustas: prevención de SKUs duplicados en memoria y base de datos, rechazo de combinaciones de atributos repetidas (normalización alfabética de llaves), rechazo de precios no válidos y prevención de stock negativo.
    * Endpoints REST: `POST /api/products/[id]/variants`, `PUT /api/products/[id]/variants/[variantId]`, `DELETE /api/products/[id]/variants/[variantId]`.
  * ✅ **Pipeline de Imágenes y Almacenamiento Compatible con Producción:**
    * Cero archivos binarios en base de datos; almacenamiento exclusivo de URLs, miniaturas y claves de referencia.
    * Adaptador de almacenamiento (`StorageService`) compatible con disco local (`public/uploads`) y preparado para buckets S3/Cloudflare R2.
    * Procesamiento avanzado con `Sharp` (`ImageProcessor`):
      * Conversión y compresión a WebP (calidad 82, límite de 1200px).
      * Generación automática de miniaturas WebP de 400x400 píxeles.
      * Borrado físico en cascada: al eliminar imágenes o productos, los archivos físicos (principal y thumbnail) se limpian del disco.
    * Endpoints REST: `POST /api/uploads` (multipart/form-data), `POST /api/products/[id]/images`, `PATCH /api/products/[id]/images/[imageId]`, `DELETE /api/products/[id]/images/[imageId]`.
  * ✅ **Interfaces Administrativas Profesionales:**
    * `/admin/productos`: Listado interactivo con búsqueda en tiempo real, filtros por categoría y estado, badges de inventario, miniatura, y acciones de edición/eliminación.
    * `/admin/productos/nuevo`: Formulario completo con generador interactivo de variantes multidimensionales, uploader de imágenes con preview en vivo y selección de imagen principal, precios, inventario y SEO.
    * `/admin/productos/[id]/editar`: Edición completa, galería de fotos con reordenamiento/marcado de principal/eliminación física, y modal de administración de variantes.
    * `/admin/categorias`: Interfaz jerárquica con árbol padre/hijo, ordenamiento, estado activo/inactivo y conteo de productos.
    * Layout de administración con navegación unificada (Dashboard, Productos, Categorías, Tienda, Cerrar sesión).
  * ✅ **Pruebas y Verificación:**
    * Suite automatizada de catálogo: `npm run test:catalog` (7/7 superadas).
    * Verificación sin regresiones: `npm run test:auth` (7/7 superadas) y `npm run test:db` (6/6 superadas).
    * Compilación Next.js limpia (`npm run build`): 21 rutas estáticas/dinámicas compiladas con éxito y 0 errores de tipos.

---

### FASE 4: MOTOR DE INVENTARIO Y VENTA FÍSICA RÁPIDA (ESTADO: COMPLETADA)
* **Hitos Implementados y Verificados:**
  * ✅ **La Regla Fundamental (Venta Física vs Online):**
    * Operativa presencial ultrarrápida: el vendedor busca el producto/variante, indica cantidad y descuenta stock con 1 clic o pulsando Enter.
    * **Cero pedidos ficticios:** Ningún registro es insertado en `orders`.
    * **Cero facturación física:** Sin pasarelas ni comprobantes fiscales innecesarios.
    * **Cero datos de compradores:** Sin solicitar nombre, cédula o teléfono a clientes presenciales.
  * ✅ **Soporte Completo para los 7 Movimientos de Inventario:**
    * `ENTRADA`: Recepción de mercancía de proveedores/producción (`+cantidad`).
    * `VENTA_FISICA`: Salida presencial directa desde el mostrador (`-cantidad`).
    * `VENTA_ONLINE`: Descuento definitivo al confirmar pedidos web con bloqueo pesimista contra condiciones de carrera.
    * `AJUSTE`: Corrección manual por merma, rotura o recuento de auditoría física (admite delta `+/-` o fijar stock exacto con justificación obligatoria).
    * `DEVOLUCION`: Reingreso de artículos al inventario disponible (`+cantidad`).
    * `RESERVA`: Retención temporal de unidades mientras se espera comprobante bancario (`-cantidad`).
    * `CANCELACION_RESERVA`: Liberación y restitución de stock al expirar o cancelarse una reserva (`+cantidad`).
    * Cada movimiento almacena: producto, variante, cantidad con signo, stock previo, stock nuevo, usuario administrativo autor (`created_by`), tipo de referencia y notas.
  * ✅ **Servicio de Dominio Transaccional (`InventoryService`):**
    * Bloqueo pesimista a nivel de fila (`SELECT ... FOR UPDATE`) dentro de transacciones de PostgreSQL para evitar que dos ventas o compras concurrentes sobrevendan la última unidad.
    * Restricción a nivel de motor de base de datos (`CHECK stock >= 0`) verificado y activo.
    * Manejo estandarizado de excepciones de negocio (`InsufficientStockError`, `ValidationError`).
  * ✅ **Endpoints REST:**
    * `POST /api/inventory/quick-sale`: Acción rápida "Vendido Físicamente" con captura de identidad de usuario desde cabeceras seguras (`x-user-id`).
    * `GET /api/inventory/status`: Matriz de stock con métricas agregadas (total unidades, stock bajo, agotados).
    * `GET /api/inventory`: Bitácora histórica paginada con filtros por tipo de movimiento, producto y rango de fechas.
    * `POST /api/inventory`: Despacho centralizado de movimientos manuales (`ENTRADA`, `AJUSTE`, `DEVOLUCION`, `RESERVA`, `CANCELACION_RESERVA`).
  * ✅ **Interfaz Administrativa Profesional (`/admin/inventario`):**
    * Tarjetas KPI en vivo: Total de productos, Unidades en stock, Alertas de stock bajo y Agotados.
    * Dock modal ultrarrápido **"⚡ VENDIDO FÍSICAMENTE"** con buscador reactivo, selección inmediata de variante y cantidad, y feedback instantáneo.
    * Matriz de stock completa con indicadores visuales de disponibilidad y botones de acción por fila (Venta, Entrada, Ajuste, Devolución).
    * Modales interactivos para entrada de mercancía, devoluciones y ajuste manual con diálogo de confirmación obligatoria para reducciones destructivas.
    * Pestaña de Historial de Movimientos con badges de color por tipo, cantidades con signo, balance antes/después y auditoría de autor.
    * Botón de acceso directo "⚡ Venta Física" integrado en la barra de navegación superior.
  * ✅ **Pruebas y Verificación:**
    * Suite automatizada de inventario: `npm run test:inventory` (**10/10 superadas** al 100%).
    * Casos límite verificados: stock 0 bloqueado, cantidad superior al stock bloqueada, condición de carrera concurrente con `Promise.allSettled` (exactamente 1 éxito y 1 rechazo, stock final = 0), y restricción CHECK de PostgreSQL.
    * Suites anteriores en verde sin regresiones: `test:catalog` (7/7), `test:auth` (7/7), `test:db` (6/6).
    * Compilación Next.js limpia (`npm run build`): 23 rutas estáticas/dinámicas compiladas con éxito y 0 errores de tipos.

---

### FASE 5: STOREFRONT PÚBLICO (EXPERIENCIA DEL CLIENTE)
* **Objetivos:**
  * Diseño visual de alta gama: paleta refinada, modo oscuro/claro, micro-interacciones dinámicas y tipografía moderna (Google Fonts).
  * Página principal con productos destacados, novedades y categorías visuales.
  * Catálogo interactivo con filtrado instantáneo por categoría, rango de precios, talla, color y disponibilidad.
  * Ficha de producto con selector dinámico de variantes (actualización en tiempo real de disponibilidad de stock y precio según combinación elegida).
  * Galería de fotos con zoom, thumbnails interactivos y soporte lazy loading nativo.

---

### FASE 6: CARRITO DE COMPRAS Y PEDIDOS POR WHATSAPP
* **Objetivos:**
  * Carrito de compras persistente en el navegador (Local Storage / Session) con validación reactiva de existencias.
  * Implementación del módulo **"Comprar / Coordinar por WhatsApp"**:
    * Lectura dinámica del número de WhatsApp oficial configurado en `system_settings`.
    * Formateo automático y limpio del mensaje con listado de productos, variantes, subtotales y datos del cliente.
    * Generación del enlace directo de WhatsApp Web / App.

---

### FASE 7: CHECKOUT ONLINE Y SISTEMA DE PAGOS POR DEPÓSITO
* **Objetivos:**
  * Flujo de checkout web sin fricción: soporte para compra como invitado y clientes con cuenta.
  * **Zero-Trust Pricing:** Recálculo obligatorio de precios, subtotales y envío del lado del servidor.
  * Selección dinámica de métodos de envío y cálculo de tarifas según zona configurada.
  * Pantalla de confirmación de pedido con número de orden único y datos bancarios para transferencia/depósito.
  * Módulo seguro de carga de comprobante bancario (JPG, PNG, PDF, WebP).
  * Transición automática a estado `PAGO_EN_REVISION` tras la carga del comprobante.

---

### FASE 8: PANEL ADMINISTRATIVO Y GESTIÓN OPERATIVA
* **Objetivos:**
  * Autenticación segura para administradores y empleados con control de acceso basado en roles (`SUPER_ADMIN`, `ADMIN`, `STAFF`).
  * Dashboard con métricas de ventas físicas, pedidos web y alertas de stock bajo.
  * Gestión integral de Pedidos Online:
    * Flujo de estados: `PENDIENTE_DE_PAGO` -> `PAGO_EN_REVISION` -> `PAGADO` -> `PREPARANDO` -> `ENVIADO` -> `ENTREGADO` -> `COMPLETADO` / `CANCELADO`.
    * Visor modal de comprobantes de pago con botones de acción rápida: **"Aprobar Pago"** y **"Rechazar Pago"** (con notificación de motivo).
    * Asignación de transportista, número de guía y URL de tracking.
  * Gestión de métodos de envío y cuentas bancarias (crear, editar, activar/desactivar).
  * Consulta pública de estado y tracking para clientes mediante número de pedido y teléfono.

---

### FASE 9: SEGURIDAD, AUDITORÍA, BACKUPS Y SEO
* **Objetivos:**
  * Auditoría de seguridad: saneamiento de entradas, protección CSRF, cabeceras de seguridad y rate-limiting en checkout y login.
  * Implementación de los scripts de backup automatizado para PostgreSQL (`scripts/backup.sh`) y restauración (`scripts/restore.sh`).
  * Optimización SEO: generación dinámica de metadatos, OpenGraph tags para previsualizaciones en WhatsApp y redes sociales, y sitemap XML.
  * Pruebas end-to-end de flujos críticos: venta física rápida vs checkout online concurrente.

---

### FASE 10: EXTENSIÓN A MARKETPLACE (FUTURO)
* **Objetivos:**
  * Activación de vendedores externos sobre la tabla `stores` ya integrada en el esquema.
  * Panel aislado para vendedores secundarios (gestión de sus propios productos y visualización de sus ventas).
  * Reglas de comisión y reparto de pagos.
