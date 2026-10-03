import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { logger } from "./logger";

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(message: string, statusCode = 400, code = "BAD_REQUEST", details?: unknown) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Recurso no encontrado", details?: unknown) {
    super(message, 404, "NOT_FOUND", details);
  }
}

export class ValidationError extends AppError {
  constructor(message = "Error de validación en los datos suministrados", details?: unknown) {
    super(message, 422, "VALIDATION_ERROR", details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "No autorizado para acceder a este recurso", details?: unknown) {
    super(message, 401, "UNAUTHORIZED", details);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Acceso denegado: permisos insuficientes", details?: unknown) {
    super(message, 403, "FORBIDDEN", details);
  }
}

export class ConflictError extends AppError {
  constructor(message = "Conflicto con el estado actual del recurso", details?: unknown) {
    super(message, 409, "CONFLICT", details);
  }
}

export class InsufficientStockError extends AppError {
  constructor(message = "Stock insuficiente para satisfacer la solicitud", details?: unknown) {
    super(message, 409, "INSUFFICIENT_STOCK", details);
  }
}

export function handleApiError(error: unknown, context = "API"): NextResponse {
  if (error instanceof AppError) {
    logger.warn(`[${context}] AppError: ${error.message}`, context, {
      code: error.code,
      statusCode: error.statusCode,
      details: error.details,
    });

    return NextResponse.json(
      {
        success: false,
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
      },
      { status: error.statusCode }
    );
  }

  if (error instanceof ZodError) {
    const formattedErrors = error.errors.map((e) => ({
      path: e.path.join("."),
      message: e.message,
    }));

    logger.warn(`[${context}] Error de Validación Zod`, context, { errors: formattedErrors });

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Los datos enviados no son válidos",
          details: formattedErrors,
        },
      },
      { status: 422 }
    );
  }

  // Errores no controlados (500)
  logger.error(`[${context}] Error Interno no controlado`, error, context);

  return NextResponse.json(
    {
      success: false,
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Ocurrió un error interno en el servidor",
      },
    },
    { status: 500 }
  );
}
