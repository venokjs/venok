import { isConstructor, isFunction } from "@venok/core/helpers/shared.helper";

export class MetadataScanner {
  private readonly cachedScannedPrototypes: Map<object, string[]> = new Map();

  public getAllMethodNames(prototype: object | null): string[] {
    if (!prototype) return [];

    if (this.cachedScannedPrototypes.has(prototype)) return this.cachedScannedPrototypes.get(prototype) as string[];

    const visitedNames = new Map<string, boolean>();
    const result: string[] = [];

    this.cachedScannedPrototypes.set(prototype, result);

    do {
      for (const property of Object.getOwnPropertyNames(prototype)) {
        if (visitedNames.has(property)) continue;

        visitedNames.set(property, true);

        const descriptor = Object.getOwnPropertyDescriptor(prototype, property);

        if (descriptor?.set || descriptor?.get) continue;

        if (isConstructor(property) || !isFunction((prototype as Record<string, any>)[property])) continue;

        result.push(property);
      }
    } while ((prototype = Reflect.getPrototypeOf(prototype)) && prototype !== Object.prototype);

    return result;
  }
}
