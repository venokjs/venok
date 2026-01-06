export const NO_EVENT_HANDLER = (text: TemplateStringsArray, pattern: string) =>
  `There is no matching event handler defined in the remote service. Event pattern: ${pattern}`;
export const NO_MESSAGE_HANDLER = `There is no matching message handler defined in the remote service.`;
export const CONNECTION_FAILED_MESSAGE = "Connection to transport failed. Trying to reconnect...";
export const MICROSERVICE_READY = `Venok microservice successfully started`;