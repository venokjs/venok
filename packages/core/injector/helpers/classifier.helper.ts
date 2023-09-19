import { ClassProvider, FactoryProvider, Provider, ValueProvider } from "@venok/core/interfaces/modules";
import { isUndefined } from "@venok/core/utils/shared.utils";

export function isClassProvider<T = any>(provider: Provider): provider is ClassProvider<T> {
  return Boolean((provider as ClassProvider<T>)?.useClass);
}

export function isValueProvider<T = any>(provider: Provider): provider is ValueProvider<T> {
  const providerValue = (provider as ValueProvider)?.useValue;
  return !isUndefined(providerValue);
}

export function isFactoryProvider<T = any>(provider: Provider): provider is FactoryProvider<T> {
  return Boolean((provider as FactoryProvider).useFactory);
}
