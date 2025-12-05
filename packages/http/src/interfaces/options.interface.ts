import type { AbstractHttpAdapter } from "~/http/adapter.js";
import type { HttpConfig } from "~/http/config.js";

export interface HttpAppOptions {
  port: number;
  callback: (app: HttpConfig<any>) => void;
  adapter: AbstractHttpAdapter;
}