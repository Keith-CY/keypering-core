import {
  JsonRpcRequest,
  AuthRequest,
  AuthResult,
  ErrorInvalidToken,
  JsonRpcResponse,
  JsonRpcResponseError,
  QueryAddressesResult,
  QueryLiveCellsParams,
  QueryLiveCellsResult,
  SignSendParams,
  SignSendResult,
  SignConfig,
  Transaction, Hash256
} from "@keypering/specs";

export default class KeyperingClient {
  private ws: WebSocket;
  private ready: Promise<any>;
  private token: string | null;
  private promises: { [key: string]: any };
  private connectionResolveFn: any;
  private connectionRejectFn: any;

  constructor(public wsEndpoint: string) {
    this.ws = new WebSocket(wsEndpoint);
    this.ws.onopen = this.onWsOpen;
    this.ws.onmessage = this.onWsMessage;
    this.ws.onerror = this.onWsError;
    this.ready = new Promise((resolve, reject) => {
      this.connectionResolveFn = resolve;
      this.connectionRejectFn = reject;
    });
    this.promises = {};
    this.token = window.localStorage.getItem("authToken");
  }

  onWsOpen = () => {
    this.connectionResolveFn();
  };

  onWsError = () => {
    this.connectionRejectFn({
      code: -1,
      message: "establish_connection_error",
    });
  };

  onWsMessage = (msg: MessageEvent) => {
    const response = JSON.parse(msg.data) as JsonRpcResponse<any, JsonRpcResponseError>;
    const {id, error, result} = response;
    if (error) {
      this.rejectPromise(id, error);
      return;
    }
    const token = result.token;
    if (token) {
      this.token = token;
      window.localStorage.setItem("authToken", token);
    }
    this.resolvePromise(id, result);
  };

  addPromise = (id: string) => {
    let resolve, reject;
    const promise = new Promise((_resolve, _reject) => {
      resolve = _resolve;
      reject = _reject;
    });
    this.promises[id] = {
      resolve,
      reject,
    };
    return promise;
  };


  resolvePromise = (id: string, result: any) => {
    const promise = this.promises[id];
    if (!promise) {
      return;
    }
    this.promises[id] = undefined;
    promise.resolve(result);
  };

  rejectPromise = (id: string, error: JsonRpcResponseError) => {
    const promise = this.promises[id];
    if (!promise) {
      return;
    }
    this.promises[id] = undefined;
    promise.reject(error);
  };

  perform = async (method: string, params: any): Promise<any> => {
    const id = new Date().getTime().toString();
    const request: JsonRpcRequest<any> = {
      id,
      jsonrpc: "2.0",
      method,
      params,
    };
    await this.ready;
    const promise = this.addPromise(id);
    this.ws.send(JSON.stringify(request));
    return await promise;
  };

  checkToken = (): string => {
    if (!this.token) {
      throw ErrorInvalidToken;
    }
    return this.token!;
  };

  requestAuth = async (params: AuthRequest): Promise<AuthResult> => {
    return await this.perform("auth", params);
  };

  queryAddresses = async (): Promise<QueryAddressesResult> => {
    return await this.perform("query_addresses", {
      token: this.checkToken(),
    });
  };

  queryLiveCells = async (lockHash: string, withData: boolean = false): Promise<QueryLiveCellsResult> => {
    let params: QueryLiveCellsParams = {
      token: this.checkToken(),
      lockHash,
      withData,
    };
    const result = await this.perform("query_live_cells", params);
    return result.liveCells;
  };

  signSendTransaction = async (description: string, tx: Transaction, lockHash: Hash256, config?: SignConfig): Promise<SignSendResult> => {
    const params: SignSendParams = {
      token: this.checkToken(),
      description,
      tx,
      lockHash,
      config: config ?? {index: 0, length: -1},
    };
    const result = await this.perform("sign_send", params);
    return result;
  };
}

