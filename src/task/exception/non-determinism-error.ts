export class NonDeterminismError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = "NonDeterminismError";
  }
}
