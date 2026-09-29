export function isMigrationFile(name) {
  return typeof name === "string" && /\.sql$/i.test(name);
}

export function pendingMigrations(files, applied = []) {
  const set = new Set(applied);
  return files
    .filter((file) => isMigrationFile(file))
    .map((path) => ({
      name: path.split(/[\\/]/).pop() || path,
      path,
    }))
    .filter(({ name }) => !set.has(name));
}
