export class ActivityNotRegisteredError extends Error {
  constructor(name: string) {
    super(`Activity function '${name}' is not registered.`);
    this.name = "ActivityNotRegisteredError";
  }
}
