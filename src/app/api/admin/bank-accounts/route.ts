import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleApiError, ValidationError } from "@/lib/errors";
import { requireAdminUser } from "@/core/auth/session";
import { z } from "zod";

export const dynamic = "force-dynamic";

const bankAccountSchema = z.object({
  bankName: z.string().min(2, "El nombre del banco es obligatorio"),
  accountNumber: z.string().min(4, "El n?mero de cuenta es obligatorio"),
  accountType: z.string().min(2, "El tipo de cuenta es obligatorio"),
  holderName: z.string().min(2, "El titular de la cuenta es obligatorio"),
  holderId: z.string().optional().default(""),
  instructions: z.string().optional().nullable(),
  sortOrder: z.number().int().optional().default(0),
  isActive: z.boolean().optional().default(true),
});

export async function GET(req: NextRequest) {
  try {
    await requireAdminUser(req);

    const accounts = await prisma.bankAccount.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({
      success: true,
      data: accounts,
    });
  } catch (error) {
    return handleApiError(error, "AdminBankAccounts.GET");
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdminUser(req);
    const body = await req.json();
    const validated = bankAccountSchema.parse(body);

    const account = await prisma.bankAccount.create({
      data: {
        bankName: validated.bankName.trim(),
        accountNumber: validated.accountNumber.trim(),
        accountType: validated.accountType.trim(),
        holderName: validated.holderName.trim(),
        holderId: (validated.holderId || "").trim(),
        instructions: validated.instructions ? validated.instructions.trim() : null,
        sortOrder: validated.sortOrder ?? 0,
        isActive: validated.isActive ?? true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Cuenta bancaria agregada exitosamente.",
        data: account,
      },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error, "AdminBankAccounts.POST");
  }
}
