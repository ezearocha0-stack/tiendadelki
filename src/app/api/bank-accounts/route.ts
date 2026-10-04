import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleApiError } from "@/lib/errors";

export const dynamic = "force-dynamic";

/**
 * GET /api/bank-accounts
 * Devuelve las cuentas bancarias activas para el checkout y confirmación de transferencias.
 */
export async function GET() {
  try {
    const bankAccounts = await prisma.bankAccount.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        bankName: true,
        accountNumber: true,
        accountType: true,
        holderName: true,
        holderId: true,
        instructions: true,
        sortOrder: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: bankAccounts,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
  } catch (error) {
    return handleApiError(error, "BankAccountsPublic.GET");
  }
}
