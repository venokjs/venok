import type { CustomDecorator } from "@venok/core";

import type { DiscoveryOptions } from "~/interfaces/index.js";

import { CoreModule, flatten, Injectable, InstanceWrapper, MetaHostStorage, ModulesContainer } from "@venok/core";

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
  public getProviders(
    options: DiscoveryOptions = {},
    modules: CoreModule[] = this.getModules(options)
  ): InstanceWrapper[] {
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
    methodKey?: string
  ): T extends CustomDecorator<infer R> ? R | undefined : T | undefined {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    if (methodKey) return Reflect.getMetadata(decorator.KEY, instanceWrapper.instance[methodKey]);

    const clsRef = instanceWrapper.instance?.constructor ?? instanceWrapper.metatype;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    return Reflect.getMetadata(decorator.KEY, clsRef);
  }

  /**
   * Returns a list of modules to be used for discovery.
   */
  protected getModules(options: DiscoveryOptions = {}): CoreModule[] {
    if (!("include" in options && options.include)) return [...this.modulesContainer.values()];

    return this.includeWhitelisted(options.include);
  }

  private includeWhitelisted(include: Function[]): CoreModule[] {
    const moduleRefs = [...this.modulesContainer.values()];
    return moduleRefs.filter(({ metatype }) => include.some((item) => item === metatype));
  }
}
