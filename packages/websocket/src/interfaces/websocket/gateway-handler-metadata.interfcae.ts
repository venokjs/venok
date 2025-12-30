export type WebsocketGatewayHandlerMetadata = {
  callback: (...args: any[]) => void;
  pattern: string;
  isAckHandledManually: boolean;
};