import { type InjectionToken, type OptionalFactoryDependency, type Type } from "~/interfaces/index.js";
import { Scope } from "~/enums/scope.enum.js";

/**
 *
 * @publicApi
 */
export type Provider<T = any> = Type | ClassProvider<T> | ValueProvider<T> | FactoryProvider<T> | ExistingProvider;

/**
 * Interface defining a *Class* type provider.
 *
 * For example:
 * ```typescript
 * const configServiceProvider = {
 * provide: ConfigService,
 * useClass:
 *   process.env.NODE_ENV === 'development'
 *     ? DevelopmentConfigService
 *     : ProductionConfigService,
 * };
 * ```
 *
 * @publicApi
 */
export interface ClassProvider<T = any> {
  /**
   * Injection token
   */
  provide: InjectionToken;
  /**
   * Type (class name) of provider (instance to be injected).
   */
  useClass: Type<T>;
  /**
   * Optional enum defining lifetime of the provider that is injected.
   */
  scope?: Scope;
  /**
   * This option is only available on factory providers!
   *
   */
  inject?: never;
  /**
   * Flags provider as durable. This flag can be used in combination with custom context id
   * factory strategy to construct lazy DI subtrees.
   *
   * This flag can be used only in conjunction with scope = Scope.REQUEST.
   */
  durable?: boolean;
}

/**
 * Interface defining a *Value* type provider.
 *
 * For example:
 * ```typescript
 * const connectionProvider = {
 *   provide: 'CONNECTION',
 *   useValue: connection,
 * };
 * ```
 *
 * @publicApi
 */
export interface ValueProvider<T = any> {
  /**
   * Injection token
   */
  provide: InjectionToken;
  /**
   * Instance of a provider to be injected.
   */
  useValue: T;
  /**
   * This option is only available on factory providers!
   *
   */
  inject?: never;
}

/**
 * Interface defining a *Factory* type provider.
 *
 * For example:
 * ```typescript
 * const connectionFactory = {
 *   provide: 'CONNECTION',
 *   useFactory: (optionsProvider: OptionsProvider) => {
 *     const options = optionsProvider.get();
 *     return new DatabaseConnection(options);
 *   },
 *   inject: [OptionsProvider],
 * };
 * ```
 *
 * @publicApi
 */
export interface FactoryProvider<T = any> {
  /**
   * Injection token
   */
  provide: InjectionToken;
  /**
   * Factory function that returns an instance of the provider to be injected.
   */
  useFactory: (...args: any[]) => T | Promise<T>;
  /**
   * Optional list of providers to be injected into the context of the Factory function.
   */
  inject?: Array<InjectionToken | OptionalFactoryDependency>;
  /**
   * Optional enum defining lifetime of the provider that is returned by the Factory function.
   */
  scope?: Scope;
  /**
   * Flags provider as durable. This flag can be used in combination with custom context id
   * factory strategy to construct lazy DI subtrees.
   *
   * This flag can be used only in conjunction with scope = Scope.REQUEST.
   */
  durable?: boolean;
}

/**
 * Interface defining an *Existing* (aliased) type provider.
 *
 * For example:
 * ```typescript
 * const loggerAliasProvider = {
 *   provide: 'AliasedLoggerService',
 *   useExisting: LoggerService
 * };
 * ```
 *
 * @publicApi
 */
export interface ExistingProvider {
  /**
   * Injection token
   */
  provide: InjectionToken;
  /**
   * Provider to be aliased by the Injection token.
   */
  useExisting: any;
}
