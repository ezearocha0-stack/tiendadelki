import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

/**
 * Genera un hash seguro para contraseñas utilizando Bcrypt con factor de coste 12.
 */
export async function hashPassword(password: string): Promise<string> {
  if (!password || password.length < 6) {
    throw new Error("La contraseña debe tener al menos 6 caracteres");
  }
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Compara una contraseña en texto plano contra su hash almacenado.
 * Implementa comparación segura en tiempo constante para mitigar ataques de temporización (timing attacks).
 */
export async function verifyPassword(password: string, hash: string | null | undefined): Promise<boolean> {
  if (!password || !hash) {
    return false;
  }
  return bcrypt.compare(password, hash);
}
