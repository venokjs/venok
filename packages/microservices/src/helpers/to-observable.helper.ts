import { from as fromPromise, isObservable, Observable, of } from "rxjs";
import { mergeMap } from "rxjs/operators";

export const transformToObservable = <T>(
  resultOrDeferred: Observable<T> | Promise<T> | T
): Observable<T> => {
  if (resultOrDeferred instanceof Promise) {
    return fromPromise(resultOrDeferred).pipe(mergeMap(val => (isObservable(val) ? val : of(val)))) as Observable<T>;
  }

  if (isObservable(resultOrDeferred)) return resultOrDeferred;


  return of(resultOrDeferred);
};