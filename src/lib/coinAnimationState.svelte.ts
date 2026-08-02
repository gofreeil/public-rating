class CoinAnimationState {
    active   = $state(false);
    amount   = $state(0);   // 10% tithe amount
    orderTotal = $state(0); // full payment total
    newFundTotal = $state(0);

    trigger(amount: number, orderTotal: number, newFundTotal: number) {
        this.amount      = amount;
        this.orderTotal  = orderTotal;
        this.newFundTotal = newFundTotal;
        this.active      = true;
    }

    reset() {
        this.active      = false;
        this.amount      = 0;
        this.orderTotal  = 0;
        this.newFundTotal = 0;
    }
}

export const coinAnim = new CoinAnimationState();
