import { AbstractHttpAdapter } from "../adapter/adapter";
import { HttpAdapterHost } from "../adapter/host";

export class HttpInstanceStorage {
  private readonly _httpAdapterHost = new HttpAdapterHost();
  private _httpAdapter!: AbstractHttpAdapter;

  get httpAdapterHost(): HttpAdapterHost {
    return this._httpAdapterHost;
  }

  get httpAdapter(): AbstractHttpAdapter {
    return this._httpAdapter;
  }

  set httpAdapter(httpAdapter: AbstractHttpAdapter) {
    this._httpAdapter = httpAdapter;
  }
}
