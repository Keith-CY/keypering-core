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
  SignAndSendParams,
  SignAndSendResult,
  SignConfig,
  Transaction
} from "@keypering/specs";

export class KeyperingClient {
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

  perform = async (method: string, params: any, withToken: boolean = true): Promise<any> => {
    if (withToken) {
      const token = this.token;
      if (!token) {
        throw ErrorInvalidToken;
      }
      params.token = token;
    }
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

  requestAuth = async (params: AuthRequest): Promise<AuthResult> => {
    return await this.perform("auth", params, false);
  };

  queryAddresses = async (): Promise<QueryAddressesResult> => {
    return await this.perform("query_addresses", {}, true);
  };

  queryLiveCells = async (lockHash: string): Promise<QueryLiveCellsResult> => {
    let params: QueryLiveCellsParams = {
      token: this.token,
      lockHash,
    };
    const result = await this.perform("query_live_cells", params, true);
    return result.liveCells;
  };

  signAndSendTransaction = async (description: string, tx: Transaction, config?: SignConfig): Promise<SignAndSendResult> => {
    const params: SignAndSendParams = {
      token: this.token,
      description,
      tx,
      config: config ?? {index: 0, length: -1},
    };
    const result = await this.perform("sign_and_send", params, true);
    return result;
  };
}

