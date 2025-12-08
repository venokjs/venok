import type { AbstractHttpAdapter } from "~/http/adapter.js";
import type { HttpConfig } from "~/http/config.js";

export interface HttpAppOptions {
  port: number;
  hostname?: string;
  listenCallback?: (...args: any[]) => Promise<void>;
  callback: (app: HttpConfig<any>) => void;
  adapter: AbstractHttpAdapter;
}