import { NextResponse } from "next/server";
import { AUTH_COOKIE_OPTIONS } from "@/core/auth/jwt";

export async function POST() {
  const response = NextResponse.json({
    success: true,
    message: "Sesión cerrada exitosamente",
  });

  // Invalidación de cookie en el cliente
  response.cookies.set({
    name: AUTH_COOKIE_OPTIONS.name,
    value: "",
    ...AUTH_COOKIE_OPTIONS.options,
    maxAge: 0,
    expires: new Date(0),
  });

  return response;
}
