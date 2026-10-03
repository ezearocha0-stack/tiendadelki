# ARQUITECTURA DEL SISTEMA: PLATAFORMA E-COMMERCE & TIENDA FÍSICA (TIENDADELKI)

**Versión:** 1.0.0  
**Fecha:** Septiembre 2026  
**Autor:** Antigravity (Lead Architect & Developer)  
**Estado:** Documento de Diseño Aprobado para Fase 1  

---

## 1. RESUMEN EJECUTIVO Y OBJETIVOS DEL SISTEMA

El proyecto **TiendaDelki** consiste en una plataforma de comercio electrónico profesional, resiliente y de alto rendimiento, diseñada para digitalizar las ventas de una tienda física sin sobrecargar la operativa presencial diaria. 

### Principios Rectores:
1. **Separación Estricta entre Venta Física y Pedido Online:** La tienda física no requiere un POS engorroso ni facturación forzosa para cada prenda; una venta física solo descuenta inventario de forma atómica y genera una traza de auditoría interna (`VENTA_FISICA`). Los pedidos online, en cambio, gestionan un ciclo de vida formal con estados, cálculo de envíos, comprobantes de pago bancarios y tracking.
2. **Cero Confianza en el Cliente (Zero-Trust Pricing):** Ningún precio ni total enviado por el navegador o cliente es aceptado por el backend. Los subtotales, descuentos, impuestos y costes de envío son recalculados y congelados en snapshots inmutables del lado del servidor en una transacción ACID.
3. **Inventario en Tiempo Real con Prevención de Sobrevendidos:** Soporte tanto para productos simples (electrónica, accesorios, hogar) como con variantes multidimensionales (ropa con talla, color, etc.), control de stock atómico con bloqueo pesimista (`SELECT ... FOR UPDATE`) o transacciones aisladas, impidiendo inventarios negativos.
4. **Preparación para Marketplace sin Complejidad Prematura:** Las entidades fundamentales (`products`, `inventory_movements`, `orders`, `categories`) incorporan un identificador contextual de tienda/vendedor (`store_id` / `seller_id`), inicialmente apuntando a la tienda física principal (`is_default = true`), facilitando la posterior transición a un modelo multi-vendedor sin requerir migraciones destructivas.

---

## 2. STACK TECNOLÓGICO SELECCIONADO & JUSTIFICACIÓN

Para un e-commerce moderno que requiere SEO excepcional, interfaces dinámicas y un backend transaccional robusto, se selecciona la siguiente pila tecnológica de grado de producción:

| Capa | Tecnología | Justificación Técnica |
| :--- | :--- | :--- |
| **Framework Fullstack** | **Next.js 15+ (App Router) / Node.js 22 LTS** | Renderizado del lado del servidor (SSR) y generación estática incremental (ISR) para SEO instantáneo de productos. API Routes / Server Actions integradas con tipado estricto end-to-end. |
| **Lenguaje** | **TypeScript 5.x** | Tipado estático estricto en toda la aplicación, reduciendo errores en tiempo de ejecución en cálculos financieros, variantes e inventarios. |
| **Base de Datos** | **PostgreSQL 16+** | RDBMS relacional por excelencia con soporte robusto para transacciones ACID, tipos compuestos, soporte JSONB para atributos dinámicos y extensiones de indexación (GIN/GiST) para búsquedas de catálogo. |
| **ORM / Query Builder** | **Prisma ORM** | Generación de tipos automáticos, migraciones declarativas seguras (`prisma migrate`), validación en tiempo de compilación y soporte para transacciones interactivas `$transaction`. |
| **Validación de Datos** | **Zod** | Esquemas de validación unificados cliente/servidor. Sanitización rigurosa de payloads de entrada, órdenes, comprobantes y variantes. |
| **Autenticación & RBAC** | **Auth.js / NextAuth v5 (o JWT Sessions seguras con Argon2/Bcrypt)** | Autenticación híbrida: sesión para panel administrativo con roles estrictos (`SUPER_ADMIN`, `ADMIN`, `STAFF`) y compras como invitado o cuentas de cliente opcionales mediante tokens seguros. |
| **Almacenamiento de Archivos** | **S3-Compatible Object Storage (Cloudflare R2 / AWS S3 / MinIO)** | Almacenamiento seguro y desacoplado para comprobantes de pago e imágenes de catálogo. Cero almacenamiento binario en BD. |
| **Procesamiento de Imágenes** | **Sharp + next/image** | Pipeline de optimización automatizada: conversión a WebP/AVIF, generación de thumbnails, compresión sin pérdida y eliminación segura. |
| **Estilos & UI** | **Vanilla CSS Moderno / CSS Modules + Design Tokens** | Control milimétrico de la estética, arquitectura visual premium con animaciones suaves, glassmorphism, modo oscuro/claro nativo, sin dependencias infladas ni riesgo de desalineación. |

---

## 3. ESTRUCTURA MODULAR DEL PROYECTO

La estructura organiza el código separando las responsabilidades de dominio (lógica de negocio), infraestructura (base de datos, almacenamiento, proveedores externos) y presentación (interfaz de cliente y panel administrativo):

```
TiendaDelki/
├── docs/
│   ├── ARCHITECTURE.md          # Especificación arquitectónica global
│   ├── DATABASE.md              # Esquema relacional, DDL y contratos de BD
│   └── ROADMAP.md               # Plan de ejecución y fases del proyecto
├── prisma/
│   ├── schema.prisma            # Modelos de datos, relaciones y enums
│   ├── migrations/              # Historial de migraciones SQL versionadas
│   └── seed.ts                  # Datos semilla (admin inicial, cuentas bancarias, métodos de envío)
├── public/
│   ├── uploads/                 # Storage local de desarrollo (aislado)
│   └── static/                  # Favicons, logos, iconos SVG
├── src/
│   ├── app/                     # Next.js App Router (Rutas y Páginas)
│   │   ├── (storefront)/        # Grupo de rutas públicas de la tienda
│   │   │   ├── page.tsx         # Página principal / Catálogo destacado
│   │   │   ├── productos/       # Exploración de productos, filtros y búsqueda
│   │   │   │   └── [slug]/      # Ficha de producto con selector de variantes
│   │   │   ├── carrito/         # Vista del carrito y checkout WhatsApp
│   │   │   ├── checkout/        # Proceso de compra, envío y subida de comprobante
│   │   │   ├── pedido/          # Consulta de estado y tracking público por código
│   │   │   └── layout.tsx       # Layout público (Navbar, Footer, Carrito flotante)
│   │   ├── (admin)/             # Grupo de rutas protegidas del panel administrativo
│   │   │   ├── admin/
│   │   │   │   ├── login/       # Login administrativo seguro
│   │   │   │   ├── dashboard/   # Métricas y accesos rápidos
│   │   │   │   ├── venta-rapida/# Acción rápida "Vendido Físicamente"
│   │   │   │   ├── productos/   # CRUD de productos, imágenes y variantes
│   │   │   │   ├── categorias/  # Gestión jerárquica de categorías
│   │   │   │   ├── inventario/  # Matriz de stock y movimientos históricos
│   │   │   │   ├── pedidos/     # Gestión de pedidos, comprobantes y tracking
│   │   │   │   ├── envios/      # Configuración de métodos de envío y tarifas
│   │   │   │   ├── cuentas/     # Configuración de cuentas bancarias
│   │   │   │   ├── configuracion/# Configuración de tienda, WhatsApp, SEO
│   │   │   │   └── layout.tsx   # Layout administrativo (Sidebar, Topbar, AuthGuard)
│   │   └── api/                 # Endpoints REST / Handlers de servicios
│   │       ├── auth/            # Endpoints de autenticación
│   │       ├── checkout/        # Endpoint de creación de pedidos (Server-side recalculation)
│   │       ├── admin/           # Endpoints administrativos protegidos por RBAC
│   │       └── uploads/         # Endpoints de firma o subida de comprobantes e imágenes
│   ├── components/              # Componentes de UI reutilizables
│   │   ├── common/              # Botones, Modales, Badges, Inputs, Spinners
│   │   ├── storefront/          # ProductCard, VariantPicker, CartDrawer, HeroBanner
│   │   └── admin/               # QuickSaleModal, OrderStatusBadge, ReceiptViewer, StockTable
│   ├── config/                  # Constantes del sistema, enums y variables de entorno
│   │   ├── site.ts              # Metadatos del sitio, SEO por defecto
│   │   └── env.ts               # Validación de variables de entorno mediante Zod
│   ├── core/                    # Lógica de Negocio Pura (Domain & Application Services)
│   │   ├── auth/                # Servicio de autenticación, hash y tokens
│   │   ├── catalog/             # Servicio de productos, variantes y categorías
│   │   ├── inventory/           # Motor de inventario: venta física, reservas, auditoría
│   │   ├── orders/              # Máquina de estados de pedidos, cálculo de totales
│   │   ├── payments/            # Verificación de comprobantes y cuentas bancarias
│   │   ├── shipping/            # Cálculo de zonas y tarifas de envío
│   │   └── storage/             # Driver de almacenamiento (S3 / R2 / Local Disk)
│   ├── lib/                     # Utilidades e integraciones de infraestructura
│   │   ├── db.ts                # Cliente Prisma singleton con pool de conexiones
│   │   ├── whatsapp.ts          # Generador de payloads y URLs de WhatsApp
│   │   ├── formatters.ts        # Formateador de moneda (DOP/RD$), fechas y pesos
│   │   └── logger.ts            # Registro de auditoría y errores estructurados
│   ├── styles/                  # Sistema de diseño CSS puro
│   │   ├── tokens.css           # Variables CSS: colores HSL, espaciados, sombras, bordes
│   │   ├── globals.css          # Reseteo CSS, tipografía moderna y estilos globales
│   │   └── animations.css       # Micro-animaciones, transiciones y efectos dinámicos
│   └── types/                   # Definiciones de tipos TypeScript compartidos
│       ├── catalog.ts           # Tipos de productos, atributos y variantes
│       ├── order.ts             # Tipos de pedidos, ítems y estados
│       ├── inventory.ts         # Tipos de movimientos y balance de stock
│       └── api.ts               # Tipos de respuestas y peticiones API
├── scripts/
│   ├── backup.sh                # Script de backup de PostgreSQL y metadatos
│   └── restore.sh               # Script de restauración y verificación de integridad
├── .env.example                 # Plantilla documentada de variables de entorno
├── next.config.mjs              # Configuración de Next.js (dominios de imágenes, headers)
├── tsconfig.json                # Configuración estricta de TypeScript
└── package.json                 # Dependencias del proyecto
```

---

## 4. MOTOR DE INVENTARIO Y FLUJO DE VENTA FÍSICA

### 4.1 La Regla Fundamental: Operativa Física vs Online
En la tienda física, la velocidad es crítica. Un vendedor no puede perder 3 minutos pidiendo nombre, cédula, dirección y generando facturas fiscales si el cliente simplemente paga en efectivo y se retira.
* **Acción Rápida "Vendido Físicamente":** Permite al administrador en 3 clics (buscar producto -> elegir variante -> cantidad -> confirmar) descontar el stock.
* **Sin Orden Fantasma:** No se inserta un registro en la tabla `orders` ni se crea un cliente ficticio.
* **Traza de Movimiento Inmutable:** Se inserta inmediatamente un registro en `inventory_movements` con tipo `VENTA_FISICA`, guardando: `product_id`, `variant_id`, `quantity` (negativo o positivo con tipo explícito), `previous_stock`, `new_stock`, `created_by` (ID del empleado/admin) y fecha.

### 4.2 Tipos de Movimientos de Inventario
El inventario nunca se actualiza "a ciegas". Toda alteración del campo `stock` en `products` o `product_variants` es el resultado de un movimiento de inventario trazable:
1. `ENTRADA`: Mercancía nueva recibida de proveedores.
2. `VENTA_FISICA`: Salida presencial rápida desde el panel administrativo.
3. `VENTA_ONLINE`: Descuento definitivo al procesar y confirmar un pedido web.
4. `AJUSTE`: Corrección manual por merma, pérdida, daño o recuento físico.
5. `DEVOLUCION`: Reingreso de un producto devuelto por cliente.
6. `RESERVA`: Retención temporal de stock mientras un cliente sube su comprobante bancario.
7. `CANCELACION_RESERVA`: Liberación de stock al expirar el tiempo de pago o rechazarse el comprobante.

### 4.3 Prevención de Inventario Negativo y Concurrencia
* Cada variante y producto simple cuenta con una restricción a nivel de base de datos: `CHECK (stock >= 0)`.
* Durante la confirmación de una venta física o el checkout de un pedido online, la consulta a la variante se ejecuta dentro de una transacción interactiva con bloqueo pesimista:
  ```sql
  SELECT id, stock FROM product_variants WHERE id = $1 FOR UPDATE;
  ```
  Si `stock < cantidad_solicitada`, la transacción aborta lanzando un error de negocio específico (`INSUFFICIENT_STOCK`), evitando condiciones de carrera (race conditions) entre una venta presencial y un pedido online simultáneo.

---

## 5. CATÁLOGO DE PRODUCTOS Y SISTEMA DE VARIANTES MULTIDIMENSIONAL

### 5.1 Flexibilidad para Ropa y Artículos Genéricos
El sistema no asume que todo ítem es ropa. Un producto puede ser:
1. **Producto Simple (sin variantes):** Artículos únicos o genéricos (ej. Lámpara de noche, Cable HDMI, Bolso único). Tienen SKU, precio y stock directo en la tabla `products`.
2. **Producto Configurable (con variantes):** Ropa, calzado, etc. La cabecera `products` actúa como contenedor de catálogo, y cada combinación física real vive en `product_variants`.

### 5.2 Estructura de Atributos Personalizados
* Para soportar atributos heterogéneos sin requerir un esquema EAV (Entity-Attribute-Value) lento y difícil de consultar, se utiliza una columna `attributes` de tipo `JSONB` en `product_variants`, complementada con una definición de esquema en `products.custom_attributes`.
* Ejemplo Ropa: `attributes = {"color": "Negro", "talla": "M"}`
* Ejemplo Calzado: `attributes = {"color": "Blanco", "talla_us": "10.5"}`
* Ejemplo Electrónica: `attributes = {"almacenamiento": "256GB", "conectividad": "5G"}`

### 5.3 Atributos Comerciales y SEO
Cada producto contiene:
* `name`, `slug` (único, indexado para URLs amigables), `description` (Markdown/HTML sanitizado).
* `base_price` (precio normal), `compare_at_price` (precio anterior para tachar), `cost_price` (solo visible para administradores).
* `is_featured` (para sliders y destacados de portada), `is_new` (etiqueta de novedad), `status` (`DRAFT`, `PUBLISHED`, `ARCHIVED`).
* Metadatos SEO: `seo_title`, `seo_description`, OpenGraph tags para preview al compartir en redes y WhatsApp.

---

## 6. CICLO DE VIDA DE PEDIDOS ONLINE Y MÁQUINA DE ESTADOS

### 6.1 Estados Formales del Pedido
```
  [ Cliente realiza pedido ]
             │
             ▼
    PENDIENTE_DE_PAGO  ──────── (Tiempo expirado / Cancelado) ───────►  CANCELADO
             │                                                              ▲
             ▼ (Cliente sube comprobante)                                  │
    PAGO_EN_REVISION   ──────── (Comprobante inválido / Rechazado) ────────┘
             │
             ▼ (Admin valida depósito en banco)
          PAGADO
             │
             ▼ (Empaquetando en tienda física)
        PREPARANDO
             │
             ▼ (Asignación de guía y transportista)
         ENVIADO
             │
             ▼ (Entrega confirmada)
        ENTREGADO
             │
             ▼ (Cierre formal de garantía / auditoría)
        COMPLETADO
```

### 6.2 Cálculo Seguro de Totales (Zero-Trust)
Cuando el cliente envía el carrito:
1. El backend recibe únicamente un array de `{ product_id, variant_id, quantity }`, los datos del cliente y el `shipping_method_id`.
2. Se consultan los precios vigentes directamente en la base de datos dentro de una transacción.
3. Se verifica el costo del método de envío seleccionado en `shipping_methods`.
4. El backend calcula:
   $$\text{subtotal} = \sum (\text{precio\_vigente} \times \text{cantidad})$$
   $$\text{total} = \text{subtotal} + \text{costo\_envío} - \text{descuentos\_servidor}$$
5. Se genera una instantánea inmutable (`snapshot`) en cada registro de `order_items` con el título del producto, SKU, precio unitario aplicado y atributos, de modo que futuros cambios de precio en el catálogo nunca alteren el historial contable de pedidos anteriores.

---

## 7. SISTEMA DE PAGOS MANUALES Y COMPROBANTES

### 7.1 Cuentas Bancarias Dinámicas
El sistema no hardcodea cuentas. El administrador gestiona una o varias entidades en la tabla `bank_accounts`:
* `bank_name` (ej. Banco BHD, Banco Popular, Banreservas)
* `account_number`
* `account_type` (Corriente / Ahorros)
* `holder_name` (Nombre del titular)
* `holder_id` (RNC / Cédula)
* `instructions` (Pasos para realizar la transferencia e indicar número de pedido como referencia)
* `is_active` (Booleano)

### 7.2 Flujo de Subida y Revisión del Comprobante
1. Tras realizar el pedido, el cliente recibe su código de orden (ej. `TK-2026-0089`) y los datos bancarios.
2. Dispone de una pantalla de seguimiento con un botón seguro de subida de comprobante (formatos aceptados: JPG, PNG, PDF, WebP; tamaño máx. 10MB).
3. El archivo se sube al almacenamiento desacoplado bajo una ruta aislada: `/receipts/{order_id}/{hash}.{ext}`.
4. El pedido pasa a `PAGO_EN_REVISION`.
5. En el panel administrativo, el pedido aparece con una alerta de pago pendiente de revisión.
6. El administrador abre el visor modal del comprobante, valida contra su estado de cuenta bancario y pulsa **"Aprobar Pago"** (pasa a `PAGADO`) o **"Rechazar Pago"** (con un motivo de rechazo opcional para que el cliente pueda reintentar la subida).

---

## 8. ENVÍOS, ZONAS DINÁMICAS Y TRACKING

### 8.1 Tarifas y Zonas Configurables
La tabla `shipping_methods` permite definir:
* Nombre (ej. "Recogida en Tienda Física", "Envío Santo Domingo / Distrito Nacional", "Envío Nacional - Expreso").
* Zona geográfica o cobertura.
* Precio base (ej. RD$0 para recogida, RD$250 local, RD$350 nacional).
* Umbral de envío gratuito (ej. Envío gratis en compras mayores a RD$3,000).
* Plazo estimado de entrega (ej. "24-48 horas laborables").
* Estado `is_active`.

### 8.2 Asignación de Tracking y Notificación
Cuando el pedido cambia a `ENVIADO`:
* El administrador completa los campos: `carrier_name` (ej. Metro Pac, Caribe Tours, BM Cargo, Mensajería Privada), `tracking_number` y `tracking_url` (si aplica).
* El cliente puede consultar el estado de su pedido en cualquier momento ingresando su número de orden y teléfono en la página pública de tracking.

---

## 9. INTEGRACIÓN CON WHATSAPP ("COMPRAR POR WHATSAPP")

Además del checkout formal, el cliente puede pulsar el botón **"Comprar / Coordinar por WhatsApp"** desde su carrito:
1. El sistema lee el número de WhatsApp oficial configurado en `system_settings`.
2. Genera un enlace `https://wa.me/{numero}?text={mensaje_codificado}` con un formato estructurado y elegante:

```text
👋 ¡Hola TiendaDelki! Quiero coordinar el siguiente pedido:

🛍️ *PRODUCTOS:*
• 1x Camisa Lino Manga Corta (Color: Negro / Talla: M) - RD$1,450
• 2x Pantalón Chino Slim (Color: Beige / Talla: 32) - RD$3,600

📦 *ENVÍO:* Envío Local (Santo Domingo) - RD$250
💰 *TOTAL ESTIMADO:* RD$5,300

👤 *MIS DATOS:*
Nombre: Carlos Gómez
Teléfono: 809-555-0199

¿Tienen disponibilidad para procesar mi pago por transferencia?
```

---

## 10. ARQUITECTURA DE IMÁGENES Y ASSETS

1. **Almacenamiento Desacoplado:** Ninguna imagen se almacena en base de datos. Se utiliza un adaptador de almacenamiento (`StorageService`) que soporta S3/R2 en producción y sistema de archivos local en desarrollo.
2. **Pipeline de Procesamiento:**
   * Las imágenes cargadas por el admin se procesan mediante `Sharp`:
     * Generación de imagen WebP de alta resolución (1200x1200px max, 85% calidad).
     * Generación de thumbnail optimizado para catálogos (400x400px max, 80% calidad).
   * Generación de BlurHash o placeholder de baja resolución para evitar saltos de layout (CLS).
3. **Gestión de Galería:**
   * La tabla `product_images` admite ordenamiento (`sort_order`), texto alternativo accesible (`alt_text`) y bandera de imagen principal (`is_primary`).
   * Eliminación segura: al borrar un producto o una imagen, el backend borra el archivo físico del bucket para no dejar datos huérfanos.

---

## 11. AUTENTICACIÓN, AUTORIZACIÓN Y SEGURIDAD

### 11.1 Modelo Híbrido de Clientes
* **Checkout como Invitado:** El usuario solo suministra su nombre, teléfono/WhatsApp, email opcional y dirección de entrega. No se obliga a crear contraseñas.
* **Cuentas de Cliente Opcionales:** Si el cliente decide registrarse, se asocia su historial de pedidos mediante su email/teléfono, permitiéndole guardar direcciones y ver favoritos.

### 11.2 Seguridad del Panel Administrativo
* Acceso restringido por middleware en rutas `/admin/*`.
* Roles de usuario (`Role` enum):
  * `SUPER_ADMIN`: Control total (gestión de usuarios administradores, configuraciones del sistema, base de datos).
  * `ADMIN`: Gestión de productos, inventario, pedidos, métodos de envío y cuentas bancarias.
  * `STAFF`: Operación de ventas físicas rápidas, preparación de pedidos y consulta de catálogo.
* Contraseñas hasheadas con **Argon2id** o **Bcrypt** con factor de coste >= 12.
* Protección contra CSRF en mutaciones, cabeceras seguras (HSTS, CSP, X-Frame-Options) y limitación de tasa de peticiones (Rate Limiting) en endpoints críticos (`/api/checkout`, `/api/admin/login`).

---

## 12. ESTRATEGIA DE BACKUPS Y RECUPERACIÓN (DISASTER RECOVERY)

1. **Backups Automatizados de Base de Datos:**
   * Ejecución diaria programada de `pg_dump` con compresión `.sql.gz`.
   * Encriptación simétrica AES-256 de los volcados antes de subirlos a un bucket de almacenamiento frío (AWS S3 Glacier o Cloudflare R2 con lifecycle rules).
   * Retención: 7 copias diarias, 4 semanales y 12 mensuales.
2. **Backups de Almacenamiento de Comprobantes e Imágenes:**
   * Bucket configurado con **Object Versioning** activado para prevenir eliminaciones accidentales o sobreescrituras maliciosas.
3. **Plan de Restauración (RTO y RPO):**
   * **RPO (Punto Objetivo de Recuperación):** Máximo 24 horas (o tiempo real si se habilita WAL archiving en el proveedor PostgreSQL).
   * **RTO (Tiempo Objetivo de Recuperación):** Menor a 30 minutos mediante el script automatizado de restauración `scripts/restore.sh`.

---

## 13. PREPARACIÓN ARQUITECTÓNICA PARA FUTURO MARKETPLACE

Para permitir que terceros vendan en TiendaDelki en el futuro sin reescribir la base de datos:
1. **Entidad `Store` / `Seller`:**
   * Se incluye una tabla `stores` con una fila por defecto: `TiendaDelki (Principal, is_default = true)`.
   * Cada producto en `products` tiene un `store_id` que por ahora referencia a la tienda principal.
2. **Aislamiento de Órdenes e Inventario:**
   * Cada movimiento de inventario y detalle de ítem de pedido registra el `store_id` del producto.
   * Cuando se active el marketplace, la lógica de checkout dividirá o agrupará los `order_items` por vendedor para permitir liquidaciones y comisiones independientes sin romper las órdenes existentes.
3. **Cero Impacto Actual:** En la fase inicial, todas las consultas asumen o filtran transparentemente por la tienda por defecto, manteniendo la arquitectura limpia y sin fricción para el comercio individual.
