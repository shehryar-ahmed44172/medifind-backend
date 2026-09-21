import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

export const hashPassword = async (password: string): Promise<string> => {
  return await bcrypt.hash(password, SALT_ROUNDS);
};

export const verifyPassword = async (
  password: string,
  hash: string
): Promise<boolean> => {
  return await bcrypt.compare(password, hash);
};

/** Passwords an attacker tries first. Compared case-insensitively. */
const WEAK_PASSWORDS = [
  'password', 'password1', 'password123', 'passw0rd', 'admin', 'admin123',
  'adminpassword', 'adminpassword123', 'medifind', 'medifind123', 'qwerty123',
  '12345678', '123456789', '1234567890', 'iloveyou', 'welcome1', 'letmein1',
];

/**
 * Rules for a password a user chooses themselves (change and reset flows).
 * Returns null when the password is acceptable, otherwise the reason to show.
 */
export const validatePasswordStrength = (password: string): string | null => {
  if (!password || password.length < 10) {
    return 'Password must be at least 10 characters long.';
  }
  if (password.length > 128) {
    return 'Password must be 128 characters or fewer.';
  }
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return 'Password must contain both letters and numbers.';
  }
  const normalised = password.toLowerCase();
  if (WEAK_PASSWORDS.some((weak) => normalised === weak || normalised.startsWith(weak))) {
    return 'This password is too easy to guess. Choose something less common.';
  }
  if (/^(.)\1+$/.test(password)) {
    return 'Password cannot be the same character repeated.';
  }
  return null;
};
