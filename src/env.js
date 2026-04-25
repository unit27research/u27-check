const ENV_PATTERNS = [
  /DATABASE_URL/i,
  /API[_-]?KEY/i,
  /SECRET/i,
  /TOKEN/i,
  /MISSING.*ENV/i,
  /environment variable/i,
  /process\.env\.[A-Z0-9_]+/,
];

export function looksLikeMissingEnv(text = '') {
  return ENV_PATTERNS.some((pattern) => pattern.test(text));
}
