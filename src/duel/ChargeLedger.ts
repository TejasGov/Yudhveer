/**
 * A defender spends remote charges before their owner can acknowledge them. Keep that spend by charge generation
 * until the owner's cumulative count catches up; rereading an older pose must not refund a blow. A new completed
 * charge has a new generation, so late verdicts from an earlier charge cannot consume the fresh three blows.
 */
export class ChargeLedger {
  private readonly spent = new Map<number, number>();
  public remaining(state: { chargeId: number; chargeSpent: number; charged: number }): number {
    return Math.max(0, state.charged - Math.max(0, (this.spent.get(state.chargeId) ?? 0) - state.chargeSpent));
  }
  public consume(state: { chargeId: number; chargeSpent: number }): void {
    this.spent.set(state.chargeId, Math.max(this.spent.get(state.chargeId) ?? 0, state.chargeSpent) + 1);
    if (this.spent.size > 64) this.spent.delete(this.spent.keys().next().value!);
  }
  public reset(): void { this.spent.clear(); }
}
