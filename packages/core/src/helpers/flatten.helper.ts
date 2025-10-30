export function flatten<T extends Array<unknown> = any>(arr: T): T extends Array<infer R> ? R : never {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  const flat: any[] = [].concat(...(arr as any[]));
  // @ts-expect-error Mismatch types
  return flat.some(Array.isArray) ? flatten(flat) : flat;
}
