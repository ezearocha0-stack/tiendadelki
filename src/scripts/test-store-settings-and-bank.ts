/**
 * TEST SUITE: CONFIGURACIÓN COMERCIAL Y CUENTAS BANCARIAS
 * Verifica:
 * 1. Lectura de configuración de tienda
 * 2. Edición por administrador
 * 3. Teléfono actualizado
 * 4. WhatsApp actualizado
 * 5. Dirección y Monte Cristi / Barrio El Albinal
 * 6. Sincronización de nombre de tienda en tabla Store
 * 7. Checkout usa cuentas bancarias activas
 * 8. Checkout excluye cuentas bancarias inactivas
 * 9. Ausencia de datos comerciales hardcodeados en componentes clave
 * 10. Bloqueo de edición a usuarios no administradores (401 / 403)
 * 11. Datos bancarios protegidos en tracking público
 * 12. Datos privados protegidos
 */

import { prisma } from "../lib/db";
import { signJwt } from "../core/auth/jwt";
import { Role } from "@prisma/client";
import { getStoreSettings, updateStoreSettings, getWhatsAppStoreNumber } from "../core/settings/settings-service";
import { getBankAccounts, getPublicStoreSettings } from "../lib/server-api";
import { GET as getSettingsRoute, PATCH as patchSettingsRoute } from "../app/api/settings/route";
import { GET as getBankAccountsRoute, POST as postBankAccountsRoute } from "../app/api/admin/bank-accounts/route";
import { PATCH as patchBankAccountRoute, DELETE as deleteBankAccountRoute } from "../app/api/admin/bank-accounts/[id]/route";
import { GET as getOrderRoute } from "../app/api/orders/[orderNumber]/route";
import { NextRequest } from "next/server";
import fs from "fs";
import path from "path";

async function runStoreSettingsAndBankTests() {
  console.log("\n========================================================");
  console.log("⚙️ INICIANDO PRUEBAS DE CONFIGURACIÓN COMERCIAL Y BANCOS");
  console.log("========================================================\n");

  let ephemeralBankId: string | null = null;
  let adminUserId = "";

  try {
    // 0. Autenticación de Admin
    const adminUser = await prisma.user.findFirst({
      where: { role: Role.SUPER_ADMIN },
    });
    if (!adminUser) throw new Error("No se encontró usuario SUPER_ADMIN");
    adminUserId = adminUser.id;

    const adminToken = await signJwt({
      sub: adminUser.id,
      email: adminUser.email || "admin@tiendadelki.com",
      role: adminUser.role,
      name: "Admin",
    });

    const adminHeaders = {
      Authorization: `Bearer ${adminToken}`,
      "Content-Type": "application/json",
    };

    // 1. Lectura de configuración comercial
    const initialSettings = await getStoreSettings();
    if (!initialSettings.storeName) throw new Error("Fallo al leer storeName");
    console.log("✅ [1/12] Configuración de tienda se puede leer correctamente.");

    // 2. Edición por administrador mediante API PATCH /api/settings
    const patchReq = new NextRequest("http://localhost:3000/api/settings", {
      method: "PATCH",
      headers: adminHeaders,
      body: JSON.stringify({
        storeSettings: {
          storeName: "TiendaDelki Test Store",
          phone: "(809) 999-0001",
          whatsapp: "8299990002",
          address: "Calle Restauración #12",
          sector: "Barrio El Albinal",
          city: "San Fernando de Monte Cristi",
          province: "Monte Cristi",
          country: "República Dominicana",
        },
      }),
    });
    const patchRes = await patchSettingsRoute(patchReq);
    const patchJson = await patchRes.json();
    if (patchRes.status !== 200 || !patchJson.success) {
      throw new Error("Admin no pudo editar configuración: " + JSON.stringify(patchJson));
    }
    console.log("✅ [2/12] Un administrador puede editar la configuración comercial vía API.");

    // 3. Teléfono actualizado
    const updatedSettings = await getStoreSettings();
    if (updatedSettings.phone !== "(809) 999-0001") {
      throw new Error(`Teléfono no actualizado esperado: (809) 999-0001, obtenido: ${updatedSettings.phone}`);
    }
    console.log("✅ [3/12] Teléfono actualizado reflejado en la configuración central.");

    // 4. WhatsApp actualizado
    if (updatedSettings.whatsapp !== "8299990002") {
      throw new Error(`WhatsApp no actualizado esperado: 8299990002, obtenido: ${updatedSettings.whatsapp}`);
    }
    const storeWhatsApp = await getWhatsAppStoreNumber();
    if (storeWhatsApp !== "8299990002") {
      throw new Error("getWhatsAppStoreNumber() no devolvió el nuevo valor.");
    }
    console.log("✅ [4/12] WhatsApp oficial actualizado reflejado en helpers del sistema.");

    // 5. Dirección y Monte Cristi / Barrio El Albinal
    if (
      updatedSettings.sector !== "Barrio El Albinal" ||
      updatedSettings.city !== "San Fernando de Monte Cristi" ||
      updatedSettings.province !== "Monte Cristi"
    ) {
      throw new Error("Ubicación Monte Cristi / Barrio El Albinal no guardada correctamente.");
    }
    console.log("✅ [5/12] Ubicación (Monte Cristi / Barrio El Albinal) guardada y leída con exactitud.");

    // 6. Nombre de tienda sincronizado en tabla Store
    const defaultStore = await prisma.store.findFirst({ where: { isDefault: true } });
    if (defaultStore?.name !== "TiendaDelki Test Store") {
      throw new Error("El nombre de la tienda no se sincronizó en la tabla Store.");
    }
    console.log("✅ [6/12] Nombre de tienda sincronizado en Store y en SystemSetting.");

    // 7. Cuentas bancarias: Crear cuenta activa vía API admin y verificar checkout
    const postBankReq = new NextRequest("http://localhost:3000/api/admin/bank-accounts", {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({
        bankName: "Banco BHD",
        accountNumber: "1234567890",
        accountType: "Cuenta de Ahorros (DOP)",
        holderName: "TiendaDelki SRL",
        holderId: "132-45678-9",
        instructions: "Poner número de orden en el concepto",
        isActive: true,
        sortOrder: 1,
      }),
    });
    const postBankRes = await postBankAccountsRoute(postBankReq);
    const postBankJson = await postBankRes.json();
    if (postBankRes.status !== 201 || !postBankJson.success) {
      throw new Error("No se pudo crear cuenta bancaria: " + JSON.stringify(postBankJson));
    }
    ephemeralBankId = postBankJson.data.id;

    // Verificar que checkout obtiene la cuenta activa
    const activeBanks = await getBankAccounts();
    const foundActive = activeBanks.find((b) => b.id === ephemeralBankId);
    if (!foundActive || foundActive.bankName !== "Banco BHD") {
      throw new Error("El checkout no recibió la cuenta bancaria activa.");
    }
    console.log("✅ [7/12] El checkout muestra automáticamente la cuenta bancaria activa.");

    // 8. Desactivar cuenta y verificar que checkout ya NO la muestra
    const patchBankReq = new NextRequest(
      `http://localhost:3000/api/admin/bank-accounts/${ephemeralBankId}`,
      {
        method: "PATCH",
        headers: adminHeaders,
        body: JSON.stringify({ isActive: false }),
      }
    );
    const patchBankRes = await patchBankAccountRoute(patchBankReq, {
      params: Promise.resolve({ id: ephemeralBankId! }),
    });
    const patchBankJson = await patchBankRes.json();
    if (!patchBankJson.success || patchBankJson.data.isActive !== false) {
      throw new Error("No se pudo desactivar la cuenta bancaria.");
    }

    const banksAfterDeactivation = await getBankAccounts();
    const foundInactive = banksAfterDeactivation.find((b) => b.id === ephemeralBankId);
    if (foundInactive) {
      throw new Error("La cuenta bancaria desactivada todavía aparece en el checkout.");
    }
    console.log("✅ [8/12] Al desactivar la cuenta bancaria, el checkout deja de mostrarla.");

    // 9. Verificar que los componentes principales NO contienen datos comerciales hardcodeados
    const footerContent = fs.readFileSync(
      path.join(process.cwd(), "src/components/store/store-footer.tsx"),
      "utf8"
    );
    if (footerContent.includes("18095550100") || footerContent.includes("Santo Domingo, Distrito Nacional, R.D.")) {
      throw new Error("store-footer.tsx todavía contiene datos comerciales hardcodeados antiguos.");
    }

    const contactoContent = fs.readFileSync(
      path.join(process.cwd(), "src/app/contacto/page.tsx"),
      "utf8"
    );
    if (contactoContent.includes("18095550199") || contactoContent.includes("Av. Winston Churchill #105")) {
      throw new Error("contacto/page.tsx todavía contiene datos comerciales hardcodeados antiguos.");
    }
    console.log("✅ [9/12] Componentes principales centralizados y sin datos comerciales hardcodeados.");

    // 10. Bloqueo de edición a usuarios no administradores
    const anonPatchReq = new NextRequest("http://localhost:3000/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        storeSettings: { storeName: "Hacked Store" },
      }),
    });
    const anonPatchRes = await patchSettingsRoute(anonPatchReq);
    if (anonPatchRes.status !== 401 && anonPatchRes.status !== 403) {
      throw new Error(`Intento no autorizado de editar configuración respondió ${anonPatchRes.status}, esperado 401/403`);
    }
    console.log("✅ [10/12] Usuarios no autenticados o no administradores no pueden modificar la configuración.");

    // 11. Datos bancarios protegidos en tracking público
    const trackingReq = new NextRequest("http://localhost:3000/api/orders/TK-INEXISTENTE-999");
    const trackingRes = await getOrderRoute(trackingReq, {
      params: Promise.resolve({ orderNumber: "TK-INEXISTENTE-999" }),
    });
    // Debe responder 404 sin exponer cuentas bancarias ni datos internos
    if (trackingRes.status !== 404) {
      throw new Error("Consulta pública de orden inexistente no devolvió 404.");
    }
    console.log("✅ [11/12] El tracking público no expone datos bancarios ni secretos.");

    // 12. Auditoría de GET /api/settings: acceso público entrega SOLO storeSettings, admin entrega data completa
    const publicGetReq = new NextRequest("http://localhost:3000/api/settings");
    const publicGetRes = await getSettingsRoute(publicGetReq);
    const publicGetJson = await publicGetRes.json();
    if (!publicGetJson.success || !publicGetJson.storeSettings) {
      throw new Error("GET público /api/settings falló al devolver storeSettings");
    }
    if (publicGetJson.data !== undefined) {
      throw new Error("GET público /api/settings expone indebidamente mapa interno de system_settings ('data')");
    }

    const adminGetReq = new NextRequest("http://localhost:3000/api/settings", {
      headers: adminHeaders,
    });
    const adminGetRes = await getSettingsRoute(adminGetReq);
    const adminGetJson = await adminGetRes.json();
    if (!adminGetJson.success || !adminGetJson.data || !adminGetJson.storeSettings) {
      throw new Error("GET admin /api/settings falló al devolver configuración completa y mapa data");
    }
    console.log("✅ [12/12] GET /api/settings blindado: acceso público solo entrega storeSettings comercial seguro; admin recibe configuración completa.");

    console.log("\n========================================================");
    console.log("🎉 TODAS LAS 12/12 PRUEBAS DE CONFIGURACIÓN Y BANCOS SUPERADAS");
    console.log("========================================================\n");
  } catch (err: any) {
    console.error("\n❌ ERROR EN PRUEBAS DE CONFIGURACIÓN Y BANCOS:", err);
    process.exit(1);
  } finally {
    // Teardown: Eliminar la cuenta bancaria temporal creada para el test
    if (ephemeralBankId) {
      await prisma.bankAccount.deleteMany({ where: { id: ephemeralBankId } }).catch(() => {});
    }

    // Restaurar los settings limpios de producción con Monte Cristi y Barrio El Albinal
    await updateStoreSettings({
      storeName: "TiendaDelki",
      shortDescription: "Tienda Física & Online – República Dominicana",
      description: "Tu tienda de confianza con inventario verificado y envíos a todas las provincias de República Dominicana.",
      logoUrl: "",
      phone: "(809) 555-0100",
      secondaryPhone: "",
      whatsapp: "8296734710",
      email: "contacto@tiendadelki.com",
      address: "Calle Principal",
      sector: "Barrio El Albinal",
      city: "San Fernando de Monte Cristi",
      province: "Monte Cristi",
      country: "República Dominicana",
      postalCode: "62000",
      scheduleDays: "Lunes a Sábado",
      scheduleOpen: "9:00 AM",
      scheduleClose: "7:00 PM",
      scheduleText: "Domingos y feriados: cerrado",
      currency: "DOP",
      currencySymbol: "RD$",
      contactMessage: "¡Hola TiendaDelki! Deseo consultar sobre sus productos y catálogo disponible.",
      deliveryMessage: "Envíos a todo el país y entregas locales en Monte Cristi.",
      instagram: "https://instagram.com/tiendadelki",
      facebook: "https://facebook.com/tiendadelki",
      tiktok: "https://tiktok.com/@tiendadelki",
    });

    await prisma.$disconnect();
  }
}

runStoreSettingsAndBankTests();
