import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleApiError } from "@/lib/errors";
import { requireAuthenticatedUser } from "@/core/auth/session";
import { customerAddressSchema } from "@/core/auth/validation";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuthenticatedUser(req);

    const addresses = await prisma.customerAddress.findMany({
      where: { userId: session.userId },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({
      success: true,
      data: addresses,
    });
  } catch (error) {
    return handleApiError(error, "CustomerAPI.GetAddresses");
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuthenticatedUser(req);
    const body = await req.json();
    const validated = customerAddressSchema.parse(body);

    const newAddress = await prisma.$transaction(async (tx) => {
      // Si se marca como predeterminada, desactivar otras direcciones previas del cliente
      if (validated.isDefault) {
        await tx.customerAddress.updateMany({
          where: { userId: session.userId },
          data: { isDefault: false },
        });
      }

      return tx.customerAddress.create({
        data: {
          userId: session.userId,
          label: validated.label,
          recipientName: validated.recipientName,
          recipientPhone: validated.recipientPhone,
          streetAddress: validated.streetAddress,
          sectorOrNeighborhood: validated.sectorOrNeighborhood,
          city: validated.city,
          provinceOrState: validated.provinceOrState,
          postalCode: validated.postalCode,
          deliveryNotes: validated.deliveryNotes,
          isDefault: validated.isDefault,
        },
      });
    });

    return NextResponse.json(
      {
        success: true,
        message: "Dirección guardada exitosamente",
        data: newAddress,
      },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error, "CustomerAPI.CreateAddress");
  }
}
