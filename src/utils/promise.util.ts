export function isPromise(fn: any): boolean {
  return fn && typeof fn?.then === "function";
}
