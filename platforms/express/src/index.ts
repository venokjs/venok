import { ExpressAdapter } from "~/adapters/express.js";

export * from "./adapters/index.js";
export * from "./interfaces/index.js";
export * from "./multer/index.js";

declare global {
  interface HttpAppOptions {
    n: string;
    port: number;
    callback: (app: ExpressAdapter) => void;
    adapter: ExpressAdapter;
  }
}
