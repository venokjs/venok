import { randomStringGenerator } from "@venok/core/utils/random-string-generator.util";

export enum UuidFactoryMode {
  Random = "random",
  Deterministic = "deterministic",
}

export class DeterministicUuidRegistry {
  private static readonly registry = new Map<string, boolean>();

  static get(str: string, inc = 0): string {
    const id = inc ? this.hashCode(`${str}_${inc}`) : this.hashCode(str);
    if (this.registry.has(id)) return this.get(str, inc + 1);

    this.registry.set(id, true);
    return id;
  }

  static clear() {
    this.registry.clear();
  }

  private static hashCode(s: string) {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
    return h.toString();
  }
}

export class UuidFactory {
  static #mode = UuidFactoryMode.Random;

  static set mode(value: UuidFactoryMode) {
    UuidFactory.#mode = value;
  }

  static get(key = "") {
    return UuidFactory.#mode === UuidFactoryMode.Deterministic
      ? DeterministicUuidRegistry.get(key)
      : randomStringGenerator();
  }
}