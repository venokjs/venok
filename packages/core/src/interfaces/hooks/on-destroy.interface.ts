/**
 * Interface defining method called just before Venok destroys the host module
 * (`app.close()` method has been evaluated).  Use to perform cleanup on
 * resources (e.g., Database connections).
 *
 * @publicApi
 */
export interface OnModuleDestroy {
  onModuleDestroy(): any;
}
