export type HttpExceptionBodyMessage = string | string[];

export interface HttpExceptionBody {
  message?: HttpExceptionBodyMessage;
  error: string;
  statusCode: number;
}

export interface HttpExceptionOptions {
  /** original cause of the error */
  cause?: unknown;
  description?: string;
}

export interface DescriptionAndOptions {
  description: string;
  httpExceptionOptions?: HttpExceptionOptions;
}