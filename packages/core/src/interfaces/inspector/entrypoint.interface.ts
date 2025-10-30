export type Entrypoint<T> = {
  id?: string;
  type: string;
  methodName: string;
  className: string;
  classNodeId: string;
  metadata: { key: string } & T;
};
