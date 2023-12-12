export class PurgeResult {
    deletedInstanceCount: number;

    constructor(
        deletedInstanceCount: number,
    ) {
        this.deletedInstanceCount = deletedInstanceCount;
    }
}