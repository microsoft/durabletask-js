export class StopIterationError extends Error {
  value: any;

  constructor(value: any) {
    super("Stop Iteration");
    this.name = "StopIterationError";
    this.value = value;
  }
}
