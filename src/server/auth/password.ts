import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

export async function hashPassword(password: string) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  passwordHash: string,
) {
  return bcrypt.compare(password, passwordHash);
}

export function validatePasswordPolicy(password: string) {
  const errors: string[] = [];

  if (password.length < 10)
    errors.push("A senha deve possuir pelo menos 10 caracteres.");

  if (!/[A-Z]/.test(password))
    errors.push("A senha deve possuir uma letra maiúscula.");

  if (!/[a-z]/.test(password))
    errors.push("A senha deve possuir uma letra minúscula.");

  if (!/[0-9]/.test(password))
    errors.push("A senha deve possuir um número.");

  if (!/[!@#$%^&*(),.?\":{}|<>_\-+=/\\[\];']/g.test(password))
    errors.push("A senha deve possuir um caractere especial.");

  return {
    valid: errors.length === 0,
    errors,
  };
}
