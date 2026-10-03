import { prisma } from "@/lib/db";
import { NotFoundError, ConflictError } from "@/lib/errors";
import { z } from "zod";
import { createCategorySchema, updateCategorySchema } from "./validation";

export class CategoryService {
  /**
   * Lista categorías jerárquicas con conteo de productos asociados.
   */
  static async listCategories(includeInactive = false) {
    const whereClause = includeInactive ? {} : { isActive: true };

    return prisma.category.findMany({
      where: whereClause,
      include: {
        parent: { select: { id: true, name: true, slug: true } },
        children: {
          where: whereClause,
          orderBy: { sortOrder: "asc" },
        },
        _count: {
          select: { products: true },
        },
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
  }

  static async getCategoryById(id: string) {
    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        parent: true,
        children: true,
        _count: { select: { products: true } },
      },
    });

    if (!category) {
      throw new NotFoundError(`Categoría con ID '${id}' no encontrada.`);
    }

    return category;
  }

  static async createCategory(rawInput: z.input<typeof createCategorySchema>) {
    const data = createCategorySchema.parse(rawInput);
    const existingSlug = await prisma.category.findUnique({
      where: { slug: data.slug },
    });

    if (existingSlug) {
      throw new ConflictError(`El slug '${data.slug}' ya está en uso por otra categoría.`);
    }

    if (data.parentId) {
      const parent = await prisma.category.findUnique({
        where: { id: data.parentId },
      });
      if (!parent) {
        throw new NotFoundError("La categoría padre especificada no existe.");
      }
    }

    return prisma.category.create({
      data: {
        name: data.name,
        slug: data.slug,
        parentId: data.parentId || null,
        description: data.description,
        imageUrl: data.imageUrl,
        sortOrder: data.sortOrder ?? 0,
        isActive: data.isActive ?? true,
      },
    });
  }

  static async updateCategory(id: string, rawInput: z.input<typeof updateCategorySchema>) {
    const data = updateCategorySchema.parse(rawInput);
    await this.getCategoryById(id);

    if (data.slug) {
      const existingSlug = await prisma.category.findFirst({
        where: {
          slug: data.slug,
          NOT: { id },
        },
      });
      if (existingSlug) {
        throw new ConflictError(`El slug '${data.slug}' ya está en uso.`);
      }
    }

    if (data.parentId) {
      if (data.parentId === id) {
        throw new ConflictError("Una categoría no puede ser su propio padre.");
      }
      const parent = await prisma.category.findUnique({
        where: { id: data.parentId },
      });
      if (!parent) {
        throw new NotFoundError("La categoría padre especificada no existe.");
      }
    }

    return prisma.category.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.slug && { slug: data.slug }),
        ...(data.parentId !== undefined && { parentId: data.parentId }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.imageUrl !== undefined && { imageUrl: data.imageUrl }),
        ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });
  }

  static async toggleActive(id: string, isActive: boolean) {
    await this.getCategoryById(id);
    return prisma.category.update({
      where: { id },
      data: { isActive },
    });
  }

  static async reorder(items: { id: string; sortOrder: number }[]) {
    return prisma.$transaction(
      items.map((item) =>
        prisma.category.update({
          where: { id: item.id },
          data: { sortOrder: item.sortOrder },
        })
      )
    );
  }

  static async deleteCategory(id: string) {
    const category = await this.getCategoryById(id);

    if (category._count.products > 0) {
      throw new ConflictError(
        `No se puede eliminar la categoría '${category.name}' porque contiene ${category._count.products} productos asociados. Considere desactivarla.`
      );
    }

    return prisma.category.delete({
      where: { id },
    });
  }
}
