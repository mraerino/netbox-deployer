const ManagedVersionRegex = /^netbox-heroku@v([0-9.]+)$/;

export const parseVersion = (version: string): string | null => {
  const matches = ManagedVersionRegex.exec(version);
  return matches?.[1] || null;
};
