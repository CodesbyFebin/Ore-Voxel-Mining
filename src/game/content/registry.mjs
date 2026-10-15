// @ts-nocheck — JavaScript fixture/import validation is exercised by Node tests; TypeScript checks the typed engine adapter.
export function registryFromBlocks(BLOCKS) {
  const result = Object.create(null);
  const normalized = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  for (const b of BLOCKS) {
    if (!b || !Number.isSafeInteger(b.id) || !b.placeable || b.id < 1 || b.id > 255) continue;
    if (normalized(b.name) === '') continue;
    result[`edgeore:${normalized(b.name)}`] = b.id;
  }
  return result;
}
