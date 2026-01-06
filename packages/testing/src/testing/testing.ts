import type { ModuleMetadata } from "@venok/core";

import { MetadataScanner } from "@venok/core";

import { TestingModuleBuilder } from "~/testing/module-builder.js";

export class Test {
  private static readonly metadataScanner = new MetadataScanner();

  public static createTestingModule(metadata: ModuleMetadata) {
    return new TestingModuleBuilder(this.metadataScanner, metadata);
  }
}