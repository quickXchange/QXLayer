export const PASSWORD_MAXIMUM = 128;
export const DEVELOPMENT_PASSWORD_HINT = '10 to 128 characters, including uppercase letters, lowercase letters and numbers. Special characters are optional.';

export function newPasswordError(value: string, development: boolean): string {
  const minimum = development ? 10 : 12;
  if (value.length < minimum || value.length > PASSWORD_MAXIMUM)
    return `Use ${minimum} to ${PASSWORD_MAXIMUM} characters.`;
  if (development && (!/[A-Z]/.test(value) || !/[a-z]/.test(value) || !/[0-9]/.test(value)))
    return 'Include uppercase letters, lowercase letters and numbers. Special characters are optional.';
  return '';
}
