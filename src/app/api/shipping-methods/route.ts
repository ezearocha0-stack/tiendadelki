import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleApiError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const methods = await prisma.shippingMethod.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        name: true,
        zoneDescription: true,
        price: true,
        freeShippingThreshold: true,
        estimatedDays: true,
      },
    });

    const formatted = methods.map((m) => ({
      id: m.id,
      name: m.name,
      zoneDescription: m.zoneDescription,
      price: Number(m.price),
      freeShippingThreshold: m.freeShippingThreshold ? Number(m.freeShippingThreshold) : null,
      estimatedDays: m.estimatedDays,
    }));

    return NextResponse.json(
      {
        success: true,
        data: formatted,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
  } catch (error) {
    return handleApiError(error, "ShippingMethodsPublic.GET");
  }
}
