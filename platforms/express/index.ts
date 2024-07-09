import { ExpressAdapter } from "@venok/express/adapters";

export * from "./adapters";
export * from "./interfaces";
export * from "./multer";

declare global {
  interface HttpAppOptions {
    n: string;
    port: number;
    callback: (app: ExpressAdapter) => void;
    adapter: ExpressAdapter;
  }
}
