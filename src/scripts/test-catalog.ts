import { CategoryService } from "../core/catalog/category-service";
import { ProductService } from "../core/catalog/product-service";
import { ImageProcessor } from "../core/images/image-processor";
import { prisma } from "../lib/db";
import sharp from "sharp";
import fs from "fs/promises";
import path from "path";

async function runCatalogTests() {
  console.log("📦 ========================================================");
  console.log("📦 INICIANDO SUITE DE PRUEBAS DEL MÓDULO DE PRODUCTOS");
  console.log("📦 ========================================================\n");

  let passed = 0;
  let total = 0;

  async function test(name: string, fn: () => Promise<void>) {
    total++;
    try {
      await fn();
      console.log(`✅ [PASS] ${name}`);
      passed++;
    } catch (err: unknown) {
      console.error(`❌ [FAIL] ${name}`);
      console.error("   Error:", err instanceof Error ? err.message : err);
    }
  }

  let testCatId = "";
  let testProductId = "";

  // Limpieza inicial de posibles pruebas anteriores interrumpidas
  await prisma.inventoryMovement.deleteMany({
    where: {
      OR: [
        { product: { slug: { startsWith: "prod-simple-" } } },
        { product: { slug: { startsWith: "pantalon-lino-" } } },
      ],
    },
  });
  await prisma.productVariant.deleteMany({
    where: {
      OR: [
        { product: { slug: { startsWith: "prod-simple-" } } },
        { product: { slug: { startsWith: "pantalon-lino-" } } },
      ],
    },
  });
  await prisma.productImage.deleteMany({
    where: {
      OR: [
        { product: { slug: { startsWith: "prod-simple-" } } },
        { product: { slug: { startsWith: "pantalon-lino-" } } },
      ],
    },
  });
  await prisma.product.deleteMany({
    where: {
      OR: [
        { slug: { startsWith: "prod-simple-" } },
        { slug: { startsWith: "pantalon-lino-" } },
      ],
    },
  });
  await prisma.category.deleteMany({
    where: { slug: { startsWith: "cat-test-" } },
  });

  // 1. Categorías: Creación y Unicidad de Slugs
  await test("CRUD Categorías: Creación con slug y prevención de slugs duplicados", async () => {
    const slug = `cat-test-${Date.now()}`;
    const cat = await CategoryService.createCategory({
      name: "Accesorios Test",
      slug,
      description: "Categoría temporal para pruebas automatizadas",
      sortOrder: 10,
      isActive: true,
    });

    testCatId = cat.id;

    if (!cat.id || cat.slug !== slug) {
      throw new Error("Categoría no creada correctamente");
    }

    // Intentar duplicar slug
    let duplicateBlocked = false;
    try {
      await CategoryService.createCategory({
        name: "Accesorios Duplicados",
        slug,
        sortOrder: 11,
        isActive: true,
      });
    } catch (e) {
      duplicateBlocked = true;
    }

    if (!duplicateBlocked) throw new Error("No se bloqueó el slug duplicado en categorías");
  });

  // 2. Categorías: Edición y Validación Jerárquica
  await test("CRUD Categorías: Edición y bloqueo de auto-paternidad", async () => {
    // Editar
    const updated = await CategoryService.updateCategory(testCatId, {
      name: "Accesorios Premium Actualizados",
      sortOrder: 15,
    });
    if (updated.name !== "Accesorios Premium Actualizados") throw new Error("Nombre no actualizado");

    // Auto-paternidad
    let selfParentBlocked = false;
    try {
      await CategoryService.updateCategory(testCatId, {
        parentId: testCatId,
      });
    } catch (e) {
      selfParentBlocked = true;
    }

    if (!selfParentBlocked) throw new Error("No se bloqueó que la categoría sea su propio padre");
  });

  // 3. Productos Simples: Creación, Precios y SKU
  await test("CRUD Productos Simples: Creación, SKU único y validación de precios", async () => {
    const pSlug = `prod-simple-${Date.now()}`;
    const pSku = `SKU-SIM-${Date.now().toString().slice(-4)}`;

    const product = await ProductService.createProduct({
      name: "Cinturón de Cuero Genuino",
      slug: pSlug,
      shortDescription: "Cinturón de cuero vacuno hecho a mano",
      description: "Cinturón clásico con hebilla metálica resistente.",
      categoryId: testCatId,
      basePrice: 1200.0,
      compareAtPrice: 1500.0,
      costPrice: 600.0,
      hasVariants: false,
      sku: pSku,
      stock: 12,
      minStock: 3,
      status: "PUBLISHED",
      isFeatured: true,
      isNew: true,
      seoTitle: "Cinturón de Cuero - TiendaDelki",
      seoDescription: "Cinturón de cuero genuino en Santo Domingo.",
      images: [],
    });

    testProductId = product.id;

    if (!product.id || product.stock !== 12) {
      throw new Error("Producto simple no creado correctamente");
    }

    // Comprobar que se registró movimiento de inventario inicial
    const movement = await prisma.inventoryMovement.findFirst({
      where: { productId: product.id },
    });
    if (!movement || movement.quantity !== 12 || movement.movementType !== "ENTRADA") {
      throw new Error("No se registró el movimiento de ENTRADA para el stock inicial");
    }

    // Intentar duplicar SKU
    let duplicateSkuBlocked = false;
    try {
      await ProductService.createProduct({
        name: "Otro Cinturón",
        slug: `otro-${Date.now()}`,
        categoryId: testCatId,
        basePrice: 1000.0,
        hasVariants: false,
        sku: pSku,
        stock: 5,
        minStock: 2,
        status: "PUBLISHED",
        isFeatured: false,
        isNew: false,
        customAttributes: [],
        images: [],
      });
    } catch (e) {
      duplicateSkuBlocked = true;
    }

    if (!duplicateSkuBlocked) throw new Error("No se bloqueó el SKU duplicado");
  });

  // 4. Variantes Flexibles: Creación y Prevención de Duplicados
  await test("Variantes Flexibles: Multidimensionales (Color, Talla, Material) y detección de duplicados", async () => {
    const vSlug = `pantalon-lino-${Date.now()}`;
    const sku1 = `LINO-BEI-32-${Date.now().toString().slice(-4)}`;
    const sku2 = `LINO-BEI-34-${Date.now().toString().slice(-4)}`;

    const productWithVariants = await ProductService.createProduct({
      name: "Pantalón Chino de Lino",
      slug: vSlug,
      categoryId: testCatId,
      basePrice: 1800.0,
      hasVariants: true,
      customAttributes: [
        { name: "Color", options: ["Beige"] },
        { name: "Talla", options: ["32", "34"] },
        { name: "Material", options: ["Lino Puro"] },
      ],
      status: "PUBLISHED",
      isFeatured: false,
      isNew: true,
      images: [],
      variants: [
        {
          title: "Beige / 32 / Lino Puro",
          sku: sku1,
          attributes: { Color: "Beige", Talla: "32", Material: "Lino Puro" },
          price: 1800.0,
          stock: 6,
          minStock: 2,
          isActive: true,
        },
        {
          title: "Beige / 34 / Lino Puro",
          sku: sku2,
          attributes: { Color: "Beige", Talla: "34", Material: "Lino Puro" },
          price: 1800.0,
          stock: 4,
          minStock: 2,
          isActive: true,
        },
      ],
    });

    try {
      if (!productWithVariants.variants || productWithVariants.variants.length !== 2) {
        throw new Error(`Se esperaban 2 variantes, se recibieron ${productWithVariants.variants?.length}`);
      }

      // Intentar agregar variante con atributos idénticos (duplicada)
      let duplicateAttrBlocked = false;
      try {
        await ProductService.addVariant(productWithVariants.id, {
          title: "Duplicada",
          sku: `DIFF-SKU-${Date.now()}`,
          attributes: { Color: "Beige", Talla: "32", Material: "Lino Puro" },
          stock: 2,
          minStock: 1,
          isActive: true,
        });
      } catch (e) {
        duplicateAttrBlocked = true;
      }

      if (!duplicateAttrBlocked) throw new Error("No se bloqueó la variante con atributos duplicados");

      // Agregar variante válida adicional
      const newVariant = await ProductService.addVariant(productWithVariants.id, {
        title: "Beige / 36 / Lino Puro",
        sku: `LINO-BEI-36-${Date.now().toString().slice(-4)}`,
        attributes: { Color: "Beige", Talla: "36", Material: "Lino Puro" },
        price: 1950.0,
        stock: 8,
        minStock: 2,
        isActive: true,
      });

      if (!newVariant.id) throw new Error("No se agregó la variante válida");
    } finally {
      // Limpiar producto de prueba
      await prisma.productVariant.deleteMany({ where: { productId: productWithVariants.id } });
      await prisma.inventoryMovement.deleteMany({ where: { productId: productWithVariants.id } });
      await prisma.product.delete({ where: { id: productWithVariants.id } });
    }
  });

  // 5. Pipeline de Imágenes con Sharp: Optimización WebP y Miniaturas
  await test("Pipeline de Imágenes: Generación WebP de alta fidelidad, miniaturas y borrado seguro", async () => {
    // Generar un buffer de imagen simulada usando Sharp
    const testImageBuffer = await sharp({
      create: {
        width: 800,
        height: 600,
        channels: 3,
        background: { r: 37, g: 99, b: 235 },
      },
    })
      .png()
      .toBuffer();

    // Procesar y almacenar con Sharp
    const processed = await ImageProcessor.processAndStore(testImageBuffer, "test_foto_producto.png");

    if (processed.format !== "webp") throw new Error("El formato de salida no es WebP");
    if (!processed.url.endsWith(".webp")) throw new Error("La URL no termina en .webp");
    if (!processed.thumbnailUrl.includes("thumb")) throw new Error("Thumbnail no generado");

    // Verificar que los archivos existen físicamente en disco
    const mainPath = path.resolve(process.cwd(), "public", processed.url.replace(/^\//, ""));
    const thumbPath = path.resolve(process.cwd(), "public", processed.thumbnailUrl.replace(/^\//, ""));

    await fs.access(mainPath);
    await fs.access(thumbPath);

    // Asociar al producto
    const attachedImage = await ProductService.addImage(testProductId, {
      url: processed.url,
      thumbnailUrl: processed.thumbnailUrl,
      storageKey: processed.storageKey,
      altText: "Foto de prueba",
      isPrimary: true,
    });

    if (!attachedImage.id || !attachedImage.isPrimary) {
      throw new Error("Imagen no asociada como principal");
    }

    // Eliminar imagen de la BD y verificar que se borraron los archivos físicos
    await ProductService.deleteImage(attachedImage.id);

    let mainStillExists = true;
    try {
      await fs.access(mainPath);
    } catch {
      mainStillExists = false;
    }

    if (mainStillExists) {
      throw new Error("El archivo físico principal no fue borrado del disco!");
    }
  });

  // 6. Búsqueda y Filtros de Productos
  await test("Listado de Productos: Filtrado por término de búsqueda y categoría", async () => {
    const res = await ProductService.listProducts({
      search: "Cinturón",
      categoryId: testCatId,
    });

    if (res.data.length === 0) {
      throw new Error("La búsqueda por 'Cinturón' no devolvió resultados");
    }
    if (res.data[0].id !== testProductId) {
      throw new Error("El producto retornado no coincide con el buscado");
    }
  });

  // 7. Limpieza Final
  await test("Limpieza y eliminación limpia de recursos de prueba", async () => {
    await prisma.inventoryMovement.deleteMany({ where: { productId: testProductId } });
    await ProductService.deleteProduct(testProductId);
    await CategoryService.deleteCategory(testCatId);
  });

  console.log("\n📦 ========================================================");
  console.log(`📦 RESULTADOS: ${passed}/${total} PRUEBAS DE CATÁLOGO SUPERADAS`);
  console.log("📦 ========================================================\n");

  if (passed !== total) {
    process.exit(1);
  }
}

runCatalogTests()
  .catch((e) => {
    console.error("Error fatal en pruebas de catálogo:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
