import { type CustomDecorator, Injectable } from "@venok/core";

import { InstanceWrapper, Module, ModulesContainer } from "@venok/core/injector/index.js";
import { MetaHostStorage } from "@venok/core/storage/meta-host.storage.js";
import type { DiscoveryOptions } from "@venok/integration/interfaces/index.js";
import { flatten } from "@venok/core/helpers/index.js";

/**
 * @publicApi
 */
@Injectable()
export class DiscoveryService {
  constructor(private readonly modulesContainer: ModulesContainer) {}

  /**
   * Returns an array of instance wrappers (providers).
   * Depending on the options, the array will contain either all providers or only providers with the specified metadata key.
   * @param options Discovery options.
   * @param modules A list of modules to filter by.
   * @returns An array of instance wrappers (providers).
   */
  public getProviders(options: DiscoveryOptions = {}, modules: Module[] = this.getModules(options)): InstanceWrapper[] {
    if ("metadataKey" in options && options.metadataKey) {
      const providers = MetaHostStorage.getProvidersByMetaKey(this.modulesContainer, options.metadataKey);
      return Array.from(providers);
    }

    const providers = modules.map((item) => [...item.providers.values()]);
    return flatten(providers);
  }

  /**
   * Retrieves metadata from the specified instance wrapper.
   * @param decorator The decorator to retrieve metadata of.
   * @param instanceWrapper Reference to the instance wrapper.
   * @param methodKey An optional method key to retrieve metadata from.
   * @returns Discovered metadata.
   */
  public getMetadataByDecorator<T extends CustomDecorator>(
    decorator: T,
    instanceWrapper: InstanceWrapper,
    methodKey?: string,
  ): T extends CustomDecorator<infer R> ? R | undefined : T | undefined {
    if (methodKey) return Reflect.getMetadata(decorator.KEY, instanceWrapper.instance[methodKey]);

    const clsRef = instanceWrapper.instance?.constructor ?? instanceWrapper.metatype;
    return Reflect.getMetadata(decorator.KEY, clsRef);
  }

  /**
   * Returns a list of modules to be used for discovery.
   */
  protected getModules(options: DiscoveryOptions = {}): Module[] {
    if (!("include" in options && options.include)) return [...this.modulesContainer.values()];

    return this.includeWhitelisted(options.include);
  }

  private includeWhitelisted(include: Function[]): Module[] {
    const moduleRefs = [...this.modulesContainer.values()];
    return moduleRefs.filter(({ metatype }) => include.some((item) => item === metatype));
  }
}
