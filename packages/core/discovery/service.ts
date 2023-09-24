import { ModulesContainer } from "@venok/core/injector/module/container";
import { CustomDecorator, SetMetadata } from "@venok/core/decorators/set-metadata.decorator";
import { Injectable } from "@venok/core/decorators/injectable.decorator";
import { uid } from "uid";
import { DiscoverableMetaHostCollection } from "@venok/core/discovery/meta-host-collection";
import { Module } from "@venok/core/injector/module/module";
import { InstanceWrapper } from "@venok/core/injector/instance/wrapper";
import { flatten } from "@venok/core/helpers/flatten.helper";

/**
 * @publicApi
 */
export interface FilterByInclude {
  /**
   * List of modules to include (whitelist) into the discovery process.
   */
  include?: Function[];
}

/**
 * @publicApi
 */
export interface FilterByMetadataKey {
  /**
   * A key to filter controllers and providers by.
   * Only instance wrappers with the specified metadata key will be returned.
   */
  metadataKey?: string;
}

/**
 * @publicApi
 */
export type DiscoveryOptions = FilterByInclude | FilterByMetadataKey;

/**
 * @publicApi
 */
export type DiscoverableDecorator<T> = ((opts?: T) => CustomDecorator) & {
  KEY: string;
};

/**
 * @publicApi
 */
@Injectable()
export class DiscoveryService {
  constructor(private readonly modulesContainer: ModulesContainer) {}

  /**
   * Creates a decorator that can be used to decorate classes and methods with metadata.
   * The decorator will also add the class to the collection of discoverable classes (by metadata key).
   * Decorated classes can be discovered using the `getProviders` and `getControllers` methods.
   * @returns A decorator function.
   */
  static createDecorator<T>(): DiscoverableDecorator<T> {
    const metadataKey = uid(21);
    const decoratorFn = (opts: T) => (target: object | Function, key?: string | symbol, descriptor?: any) => {
      if (!descriptor) {
        DiscoverableMetaHostCollection.addClassMetaHostLink(target as Function, metadataKey);
      }
      SetMetadata(metadataKey, opts ?? {})(target, key ?? "", descriptor);
    };

    decoratorFn.KEY = metadataKey;
    return decoratorFn as DiscoverableDecorator<T>;
  }

  /**
   * Returns an array of instance wrappers (providers).
   * Depending on the options, the array will contain either all providers or only providers with the specified metadata key.
   * @param options Discovery options.
   * @param modules A list of modules to filter by.
   * @returns An array of instance wrappers (providers).
   */
  public getProviders(options: DiscoveryOptions = {}, modules: Module[] = this.getModules(options)): InstanceWrapper[] {
    if ("metadataKey" in options && options.metadataKey) {
      const providers = DiscoverableMetaHostCollection.getProvidersByMetaKey(
        this.modulesContainer,
        options.metadataKey,
      );
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
  public getMetadataByDecorator<T extends DiscoverableDecorator<any>>(
    decorator: T,
    instanceWrapper: InstanceWrapper,
    methodKey?: string,
  ): T extends DiscoverableDecorator<infer R> ? R | undefined : T | undefined {
    if (methodKey) {
      return Reflect.getMetadata(decorator.KEY, instanceWrapper.instance[methodKey]);
    }

    const clsRef = instanceWrapper.instance?.constructor ?? instanceWrapper.metatype;
    return Reflect.getMetadata(decorator.KEY, clsRef);
  }

  /**
   * Returns a list of modules to be used for discovery.
   */
  protected getModules(options: DiscoveryOptions = {}): Module[] {
    if (!("include" in options && options.include)) {
      return [...this.modulesContainer.values()];
    }
    return this.includeWhitelisted(options.include);
  }

  private includeWhitelisted(include: Function[]): Module[] {
    const moduleRefs = [...this.modulesContainer.values()];
    return moduleRefs.filter(({ metatype }) => include.some((item) => item === metatype));
  }
}
