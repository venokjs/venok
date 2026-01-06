import type { DynamicModule, OnApplicationShutdown } from "@venok/core";

import type { ClientsModuleOptionsFactory, ClientsProviderAsyncOptions } from "~/interfaces/clients-module.interface.js";
import type { MicroserviceClientOptions } from "~/interfaces/client.interface.js";
import type { ReadPacket, WritePacket } from "~/index.js";

import { beforeEach, describe, expect, it, mock, spyOn } from "bun:test";

import { ClientsModule } from "~/microservices/clients-module.js";
import { MicroserviceClient, MicroserviceClientFactory } from "~/microservices/client.js";

// Mock MicroserviceClient for testing
class MockMicroserviceClient extends MicroserviceClient {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars,@stylistic/max-len
  public on<EventKey extends never = never, EventCallback extends Record<never, Function>[EventKey] = Record<never, Function>[EventKey]>(event: EventKey, callback: EventCallback): void {
    throw new Error("Method not implemented.");
  }
  public unwrap<T>(): T {
    throw new Error("Method not implemented.");
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected publish(packet: ReadPacket, callback: (packet: WritePacket) => void): () => void {
    throw new Error("Method not implemented.");
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected dispatchEvent<T = any>(packet: ReadPacket): Promise<T> {
    throw new Error("Method not implemented.");
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected serializeError<T = any>(err: any): T {
    throw new Error("Method not implemented.");
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected serializeResponse<T = any>(response: any): T {
    throw new Error("Method not implemented.");
  }
  protected serializer = { serialize: (value: any) => value };
  protected deserializer = { deserialize: (value: any) => value };
  
  async connect() {
    return Promise.resolve();
  }
  
  close() {
    return Promise.resolve();
  }
}

describe("ClientsModule", () => {
  let dynamicModule: DynamicModule;

  beforeEach(() => {
    // Clear mocks between tests
    mock.restore();
  });

  describe("register", () => {
    describe("when options is an array", () => {
      beforeEach(() => {
        const mockClientOptions: MicroserviceClientOptions = {
          customClass: MockMicroserviceClient,
          options: {},
        };

        spyOn(MicroserviceClientFactory, "create").mockReturnValue(new MockMicroserviceClient());

        dynamicModule = ClientsModule.register([
          {
            name: "test",
            ...mockClientOptions,
          },
        ]);
      });

      it("should return an expected module ref", () => {
        expect(dynamicModule.module).toBe(ClientsModule);
      });

      it("should return global as false when not specified", () => {
        expect(dynamicModule.global).toBe(false);
      });

      it("should return an expected providers array", () => {
        expect(dynamicModule.providers).toHaveLength(1);
        
        const provider = dynamicModule.providers![0] as any;
        expect(provider.provide).toBe("test");
        expect(provider.useValue).toBeDefined();
        expect(typeof provider.useValue.close).toBe("function");
      });

      it("should export the same providers", () => {
        expect(dynamicModule.exports).toBe(dynamicModule.providers);
      });

      it("should call MicroserviceClientFactory.create", () => {
        expect(MicroserviceClientFactory.create).toHaveBeenCalledWith({
          customClass: MockMicroserviceClient,
          options: {},
          name: "test",
        });
      });
    });

    describe("when options is an object with clients array", () => {
      beforeEach(() => {
        const mockClientOptions: MicroserviceClientOptions = {
          customClass: MockMicroserviceClient,
          options: {},
        };

        spyOn(MicroserviceClientFactory, "create").mockReturnValue(new MockMicroserviceClient());

        dynamicModule = ClientsModule.register({
          clients: [
            {
              name: "test",
              ...mockClientOptions,
            },
          ],
          isGlobal: true,
        });
      });

      it("should return global as true when isGlobal is specified", () => {
        expect(dynamicModule.global).toBe(true);
      });

      it("should return an expected providers array", () => {
        expect(dynamicModule.providers).toHaveLength(1);
        
        const provider = dynamicModule.providers![0] as any;
        expect(provider.provide).toBe("test");
        expect(provider.useValue).toBeDefined();
      });
    });

    describe("when options array is empty", () => {
      beforeEach(() => {
        dynamicModule = ClientsModule.register([]);
      });

      it("should return empty providers array", () => {
        expect(dynamicModule.providers).toHaveLength(0);
      });
    });
  });

  describe("registerAsync", () => {
    describe("when options is an array", () => {
      describe("when useFactory", () => {
        const useFactory = () => ({
          customClass: MockMicroserviceClient,
          options: {},
        });

        beforeEach(() => {
          spyOn(MicroserviceClientFactory, "create").mockReturnValue(new MockMicroserviceClient());

          const registerOption: ClientsProviderAsyncOptions = {
            name: "test",
            useFactory,
            inject: ["DEPENDENCY"],
          };

          dynamicModule = ClientsModule.registerAsync([registerOption]);
        });

        it("should return an expected module ref", () => {
          expect(dynamicModule.module).toBe(ClientsModule);
        });

        it("should return expected module structure", () => {
          expect(dynamicModule.imports).toEqual([]);
          expect(dynamicModule.exports).toBe(dynamicModule.providers);
          expect(dynamicModule.providers).toHaveLength(1);
        });

        it("should return an expected providers array with useFactory", () => {
          const provider = dynamicModule.providers![0] as any;
          expect(provider.provide).toBe("test");
          expect(provider.inject).toEqual(["DEPENDENCY"]);
          expect(typeof provider.useFactory).toBe("function");
        });

        it("should create factory wrapper that calls MicroserviceClientFactory", async () => {
          const provider = dynamicModule.providers![0] as any;
          const client = await provider.useFactory("dependency");
          
          expect(MicroserviceClientFactory.create).toHaveBeenCalled();
          expect(typeof client.close).toBe("function");
          expect(typeof (client as OnApplicationShutdown).onApplicationShutdown).toBe("function");
        });
      });

      describe("when useClass", () => {
        class ClientOptionService implements ClientsModuleOptionsFactory {
          createClientOptions(): MicroserviceClientOptions {
            return {
              customClass: MockMicroserviceClient,
              options: {},
            };
          }
        }

        beforeEach(() => {
          spyOn(MicroserviceClientFactory, "create").mockReturnValue(new MockMicroserviceClient());

          const useClassOption: ClientsProviderAsyncOptions = {
            name: "classTest",
            useClass: ClientOptionService,
          };

          dynamicModule = ClientsModule.registerAsync([useClassOption]);
        });

        it("should return an expected providers array with useClass", () => {
          expect(dynamicModule.imports).toEqual([]);
          expect(dynamicModule.providers).toHaveLength(2);

          const classTestProvider = dynamicModule.providers![0] as any;
          expect(classTestProvider.provide).toBe("classTest");
          expect(classTestProvider.inject).toEqual([ClientOptionService]);
          expect(typeof classTestProvider.useFactory).toBe("function");

          const serviceProvider = dynamicModule.providers![1] as any;
          expect(serviceProvider.provide).toBe(ClientOptionService);
          expect(serviceProvider.useClass).toBe(ClientOptionService);
        });

        it("should call createClientOptions on the factory", async () => {
          const provider = dynamicModule.providers![0] as any;
          const optionsFactory = new ClientOptionService();
          const createClientOptionsSpy = spyOn(optionsFactory, "createClientOptions");
          
          await provider.useFactory(optionsFactory);
          
          expect(createClientOptionsSpy).toHaveBeenCalled();
          expect(MicroserviceClientFactory.create).toHaveBeenCalled();
        });
      });

      describe("when useExisting", () => {
        class ExistingService implements ClientsModuleOptionsFactory {
          createClientOptions(): MicroserviceClientOptions {
            return {
              customClass: MockMicroserviceClient,
              options: {},
            };
          }
        }

        beforeEach(() => {
          spyOn(MicroserviceClientFactory, "create").mockReturnValue(new MockMicroserviceClient());

          const asyncOptions: ClientsProviderAsyncOptions = {
            name: "existingTest",
            useExisting: ExistingService,
          };

          dynamicModule = ClientsModule.registerAsync([asyncOptions]);
        });

        it("should provide an options with useExisting", () => {
          expect(dynamicModule.providers).toHaveLength(1);
          expect(dynamicModule.imports).toEqual([]);
          
          const provider = dynamicModule.providers![0] as any;
          expect(provider.provide).toBe("existingTest");
          expect(provider.inject).toEqual([ExistingService]);
          expect(typeof provider.useFactory).toBe("function");
        });
      });

      describe("with extraProviders", () => {
        const extraProvider = { provide: "EXTRA", useValue: "extra" };

        beforeEach(() => {
          spyOn(MicroserviceClientFactory, "create").mockReturnValue(new MockMicroserviceClient());

          const registerOption: ClientsProviderAsyncOptions = {
            name: "test",
            useFactory: () => ({ customClass: MockMicroserviceClient, options: {} }),
            extraProviders: [extraProvider],
          };

          dynamicModule = ClientsModule.registerAsync([registerOption]);
        });

        it("should include extra providers", () => {
          expect(dynamicModule.providers).toHaveLength(2);
          expect(dynamicModule.providers).toContain(extraProvider);
        });
      });

      describe("with imports", () => {
        class ImportedModule {}

        beforeEach(() => {
          spyOn(MicroserviceClientFactory, "create").mockReturnValue(new MockMicroserviceClient());

          const registerOption: ClientsProviderAsyncOptions = {
            name: "test",
            useFactory: () => ({ customClass: MockMicroserviceClient, options: {} }),
            imports: [ImportedModule],
          };

          dynamicModule = ClientsModule.registerAsync([registerOption]);
        });

        it("should include imports", () => {
          expect(dynamicModule.imports).toContain(ImportedModule);
        });

        it("should not duplicate imports", () => {
          const registerOptions: ClientsProviderAsyncOptions[] = [
            {
              name: "test1",
              useFactory: () => ({ customClass: MockMicroserviceClient, options: {} }),
              imports: [ImportedModule],
            },
            {
              name: "test2",
              useFactory: () => ({ customClass: MockMicroserviceClient, options: {} }),
              imports: [ImportedModule],
            },
          ];

          const testModule = ClientsModule.registerAsync(registerOptions);
          expect(testModule.imports).toHaveLength(1);
          expect(testModule.imports).toContain(ImportedModule);
        });
      });
    });

    describe("when options is an object with clients array", () => {
      beforeEach(() => {
        spyOn(MicroserviceClientFactory, "create").mockReturnValue(new MockMicroserviceClient());

        dynamicModule = ClientsModule.registerAsync({
          clients: [
            {
              name: "test",
              useFactory: () => ({ customClass: MockMicroserviceClient, options: {} }),
            },
          ],
          isGlobal: true,
        });
      });

      it("should return global as true when isGlobal is specified", () => {
        expect(dynamicModule.global).toBe(true);
      });

      it("should return an expected providers array", () => {
        expect(dynamicModule.providers).toHaveLength(1);
        
        const provider = dynamicModule.providers![0] as any;
        expect(provider.provide).toBe("test");
        expect(typeof provider.useFactory).toBe("function");
      });
    });
  });

  describe("assignOnAppShutdownHook", () => {
    it("should assign onApplicationShutdown hook to client", () => {
      const mockClient = new MockMicroserviceClient();
      spyOn(mockClient, "close");

      const result = ClientsModule["assignOnAppShutdownHook"](mockClient) as any;
      
      expect(typeof result.onApplicationShutdown).toBe("function");
      expect(result.onApplicationShutdown).toBe(mockClient.close);
    });
  });

  describe("createFactoryWrapper", () => {
    it("should create a factory wrapper that creates and configures client", async () => {
      const mockFactory = mock(() => ({
        customClass: MockMicroserviceClient,
        options: { test: true },
      }));

      spyOn(MicroserviceClientFactory, "create").mockReturnValue(new MockMicroserviceClient());

      const wrapper = ClientsModule["createFactoryWrapper"](mockFactory);
      const result = await wrapper("arg1", "arg2");

      expect(mockFactory).toHaveBeenCalledWith("arg1", "arg2");
      expect(MicroserviceClientFactory.create).toHaveBeenCalledWith({
        customClass: MockMicroserviceClient,
        options: { test: true },
      });
      expect(typeof (result as unknown as OnApplicationShutdown).onApplicationShutdown).toBe("function");
    });
  });
});