import { randomStringGenerator } from "@venok/core/utils/random-string-generator.util";
import { UuidFactory } from "@venok/core/helpers/uuid.helper";
import { Type } from "@venok/core/interfaces";

export class Module {
  readonly #id: string;
  // @ts-ignore
  #token: string;
  #distance = 0;
  #initOnPreview = false;
  #isGlobal = false;

  constructor(private readonly _metatype: Type) {
    this.#id = this.generateUuid();
  }

  get id(): string {
    return this.#id;
  }

  get token(): string {
    return this.#token;
  }

  set token(token: string) {
    this.#token = token;
  }

  get name() {
    return this.metatype.name;
  }

  get isGlobal() {
    return this.#isGlobal;
  }

  set isGlobal(global: boolean) {
    this.#isGlobal = global;
  }

  get initOnPreview() {
    return this.#initOnPreview;
  }

  set initOnPreview(initOnPreview: boolean) {
    this.#initOnPreview = initOnPreview;
  }

  get metatype(): Type<any> {
    return this._metatype;
  }

  get distance(): number {
    return this.#distance;
  }

  set distance(value: number) {
    this.#distance = value;
  }

  private generateUuid(): string {
    const prefix = "M_  ";
    const key = this.name?.toString() ?? this.token?.toString();
    return key ? UuidFactory.get(`${prefix}#${key}`) : randomStringGenerator();
  }
}
