import { GET } from "../app/api/inventory/route";
import { NextRequest } from "next/server";
import { signJwt } from "../core/auth/jwt";
import { Role } from "@prisma/client";
import { prisma } from "../lib/db";

async function verifyInventoryStatus() {
  const token = await signJwt({
    sub: "cmtp4y4wl0001uc50l7eq1oce",
    email: "admin@tiendadelki.com",
    role: Role.SUPER_ADMIN,
    name: "Admin",
  });

  const req = new NextRequest("http://localhost:3000/api/inventory", {
    headers: { authorization: `Bearer ${token}` },
  });

  const res = await GET(req);
  const json = await res.json();
  console.log("Inventory API Status:", res.status);
  console.log("Inventory API Success:", json.success);
  console.log("Inventory items returned:", json.data?.items?.length ?? json.data?.length ?? 0);

  const productCount = await prisma.product.count();
  console.log("DB Total Products:", productCount);

  if (productCount === 0 && (json.data?.items?.length ?? 0) === 0) {
    console.log("✅ VERIFICADO: /admin/inventario queda 100% limpio sin productos comerciales.");
  } else {
    console.error("❌ ERROR: Aún existen productos en inventario.");
    process.exit(1);
  }

  await prisma.$disconnect();
}

verifyInventoryStatus();
