export function flatten<T extends Array<unknown> = any>(arr: T): T extends Array<infer R> ? R : never {
  // @ts-ignore
  const flat: any[] = [].concat(...arr);
  return flat.some(Array.isArray) ? flatten(flat) : flat;
}
