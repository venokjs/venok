import { Type } from "@venok/core/interfaces";
import { ModulesContainer } from "@venok/core/injector/module/container";
import { InstanceWrapper } from "@venok/core/injector/instance/wrapper";

export class DiscoverableMetaHostCollection {
  /**
   * A map of class references to metadata keys.
   */
  public static readonly metaHostLinks = new Map<Type | Function, string>();

  /**
   * A map of metadata keys to instance wrappers (providers) with the corresponding metadata key.
   * The map is weakly referenced by the modules container (unique per application).
   */
  private static readonly providersByMetaKey = new WeakMap<ModulesContainer, Map<string, Set<InstanceWrapper>>>();

  /**
   * Adds a link between a class reference and a metadata key.
   * @param target The class reference.
   * @param metadataKey The metadata key.
   */
  public static addClassMetaHostLink(target: Type | Function, metadataKey: string) {
    this.metaHostLinks.set(target, metadataKey);
  }

  /**
   * Inspects a provider instance wrapper and adds it to the collection of providers
   * if it has a metadata key.
   * @param hostContainerRef A reference to the module's container.
   * @param instanceWrapper A provider instance wrapper.
   * @returns void
   */
  public static inspectProvider(hostContainerRef: ModulesContainer, instanceWrapper: InstanceWrapper) {
    return this.inspectInstanceWrapper(hostContainerRef, instanceWrapper, this.providersByMetaKey);
  }

  public static insertByMetaKey(
    metaKey: string,
    instanceWrapper: InstanceWrapper,
    collection: Map<string, Set<InstanceWrapper>>,
  ) {
    if (collection.has(metaKey)) {
      const wrappers = collection.get(metaKey) as Set<InstanceWrapper>;
      wrappers.add(instanceWrapper);
    } else {
      const wrappers = new Set<InstanceWrapper>();
      wrappers.add(instanceWrapper);
      collection.set(metaKey, wrappers);
    }
  }

  public static getProvidersByMetaKey(hostContainerRef: ModulesContainer, metaKey: string): Set<InstanceWrapper> {
    const wrappersByMetaKey = this.providersByMetaKey.get(hostContainerRef) as Map<string, Set<InstanceWrapper<any>>>;
    return wrappersByMetaKey.get(metaKey) as Set<InstanceWrapper<any>>;
  }

  private static inspectInstanceWrapper(
    hostContainerRef: ModulesContainer,
    instanceWrapper: InstanceWrapper,
    wrapperByMetaKeyMap: WeakMap<ModulesContainer, Map<string, Set<InstanceWrapper>>>,
  ) {
    const metaKey = DiscoverableMetaHostCollection.getMetaKeyByInstanceWrapper(instanceWrapper);
    if (!metaKey) {
      return;
    }

    let collection: Map<string, Set<InstanceWrapper>>;
    if (wrapperByMetaKeyMap.has(hostContainerRef)) {
      collection = wrapperByMetaKeyMap.get(hostContainerRef) as Map<string, Set<InstanceWrapper<any>>>;
    } else {
      collection = new Map<string, Set<InstanceWrapper>>();
      wrapperByMetaKeyMap.set(hostContainerRef, collection);
    }
    this.insertByMetaKey(metaKey, instanceWrapper, collection);
  }

  private static getMetaKeyByInstanceWrapper(instanceWrapper: InstanceWrapper<any>) {
    return this.metaHostLinks.get(
      // NOTE: Regarding the ternary statement below,
      // - The condition `!wrapper.metatype` is needed because when we use `useValue`
      // the value of `wrapper.metatype` will be `null`.
      // - The condition `wrapper.inject` is needed here because when we use
      // `useFactory`, the value of `wrapper.metatype` will be the supplied
      // factory function.
      // For both cases, we should use `wrapper.instance.constructor` instead
      // of `wrapper.metatype` to resolve processor's class properly.
      // But since calling `wrapper.instance` could degrade overall performance
      // we must defer it as much we can.
      instanceWrapper.metatype || instanceWrapper.inject
        ? instanceWrapper.instance?.constructor ?? instanceWrapper.metatype
        : instanceWrapper.metatype,
    );
  }
}
