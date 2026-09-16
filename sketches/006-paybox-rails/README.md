## Variant: Paybox Rails

### Design stance
Paybox connectivity as a first-class "rail" — MoonPay's non-custodial payment vault gives the agent fleet wallets, cards, and credentials behind a key only the user controls. Trust language is the design.

### Flow
1. **Empty state** — dashed connect card: what agents get, trust chips (non-custodial MPC/TEE, per-agent caps, multi-chain, revoke anytime)
2. **Connect modal (2 steps)** — link paybox.sh → approve scoped session key; permission toggles (x402 settle / capped spend / card access), spend-limit picker, chain chips
3. **Connected dashboard** — vault bar with live badge, balances (USDC/SOL/USDc + fiat card), per-agent spend-limit meters, recent settlements ledger (x402 in, agent bills out), and a permissions list with scope tags (`x402:settle`, `pay:capped`, `swap:gas`, withdraw=off)

### Key choices
- Paybox brand color (#5b6cff) distinct from Shipyard purple so rails feel like a connected external system
- Scope tags in mono read like OAuth scopes — familiar trust pattern
- Withdrawals explicitly OFF by default; require in-chat confirmation → ties to Vic's approval cards

### Trade-offs
- Strong at: makes "agents with money" feel safe and controllable
- Weak at: modal is dense — real app may want a settings sub-page for chains/limits

### Integration notes
- `@paybox-sh/sdk` already in shipyard-os package.json
- Spend limits reuse the approval-card policy object from variant 005
- Settlements ledger pairs with the Treasury card in 005 (same data, rails view)
