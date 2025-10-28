export function flatten<T extends Array<unknown> = any>(arr: T): T extends Array<infer R> ? R : never {
  const flat: any[] = [].concat(...(arr as any[]));
  // @ts-expect-error Mismatch types
  return flat.some(Array.isArray) ? flatten(flat) : flat;
}
