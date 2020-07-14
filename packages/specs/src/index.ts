export interface JsonRpcRequest<RequestParams> {
  id: string;
  jsonrpc: string;
  method: string;
  params: RequestParams;
}

export interface JsonRpcResponseError {
  code: number;
  message: string;
}

export interface JsonRpcResponse<ResponseResult, ResponseError> {
  id: string;
  jsonrpc: string;
  result?: ResponseResult;
  error?: ResponseError;
}

// errors
export const ErrorRejected: JsonRpcResponseError = {
  code: 1,
  message: "rejected",
};

export const ErrorInvalidToken: JsonRpcResponseError = {
  code: 2,
  message: "invalid_token",
}

// auth
export interface AuthParams {
  url: string;
  description: string;
}

export interface AuthResult {
  token: string;
}

export type AuthError = typeof ErrorRejected;

export type AuthRequest = JsonRpcRequest<AuthParams>;
export type AuthResponse = JsonRpcResponse<AuthResult, AuthError>;

export type FnAuth = (request: AuthRequest) => Promise<AuthResponse>;

// query_addresses
export interface QueryAddressesParams {
  token: string;
}

export type Hash256 = string;
export type ScriptHashType = "data" | "type";
export type Bytes = string;
export type Uint64 = string;

export interface Script {
  codeHash: Hash256;
  hashType: ScriptHashType;
  args: Bytes;
}

export interface Address {
  address: string;
  lockHash: string;
  lockScriptName: string;
  lockScript: Script;
}

export type QueryAddressesResult = Address[];

export type QueryAddressesError = typeof ErrorRejected | typeof ErrorInvalidToken;

export type QueryAddressesRequest = JsonRpcRequest<QueryAddressesParams>;

export type QueryAddressesResponse = JsonRpcResponse<QueryAddressesResult, QueryAddressesError>;

export type FnQueryAddresses = (request: QueryAddressesRequest) => Promise<QueryAddressesResponse>;

// query_live_cells

export interface QueryLiveCellsParams {
  token: string;
  lockHash: string;
  returnData?: boolean;
}

export interface CellOutput {
  capacity: string;
  lock: Script;
  type: Script | null;
  outputDataLength: Uint64;
}

export interface CellCreatedBy {
  blockNumber: Uint64;
  index: Uint64;
  txHash: Hash256;
}

export interface CellData {
  content: string;
  hash: Hash256;
}

export interface LiveCell {
  cellOutput: CellOutput;
  cellbase: boolean;
  createdBy: CellCreatedBy;
  outputDataLen: Uint64;
  data?: CellData;
}

export interface QueryLiveCellsResult {
  liveCells: LiveCell[];
}

export type QueryLiveCellsError = typeof ErrorRejected | typeof ErrorInvalidToken;

export type QueryLiveCellsRequest = JsonRpcRequest<QueryLiveCellsParams>;

export type QueryLiveCellsResponse = JsonRpcResponse<QueryLiveCellsResult, QueryLiveCellsError>;

export type FnQueryLiveCells = (request: QueryLiveCellsRequest) => Promise<QueryLiveCellsResponse>;

// sign_and_send
export interface SignConfig {
  index: number;
  length: number;
}

export type Transaction = any;
export type SignedTransaction = any;

export interface SignAndSendParams {
  token: string;
  description: string;
  tx: Transaction;
  config?: SignConfig;
}

export interface SignAndSendResult {
  tx: SignedTransaction;
  txHash: Hash256;
}

export type SignAndSendError = typeof ErrorRejected | typeof ErrorInvalidToken;

export type SignAndSendRequest = JsonRpcRequest<SignAndSendParams>;

export type SignAndSendResponse = JsonRpcResponse<SignAndSendRequest, SignAndSendError>;

export type FnSignAndSend = (request: SignAndSendRequest) => Promise<SignAndSendResponse>;
