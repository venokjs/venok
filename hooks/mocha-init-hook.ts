export const mochaHooks = (): any => {
  return {
    async beforeAll(this: any) {
      await import("reflect-metadata");
    },
  };
};
