export function normalizeId(obj) {
  if (!obj) return obj;
  return { ...obj, id: obj.id || obj._id };
}

export function normalizeArray(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.map(normalizeId);
}