import { uid } from "uid";

import { Module } from "./module.js";

export class ModulesContainer extends Map<string, Module> {
  readonly #applicationId = uid(21);

  get applicationId(): string {
    return this.#applicationId;
  }

  public getById(id: string): Module | undefined {
    return Array.from(this.values()).find((moduleRef) => moduleRef.id === id);
  }
}
