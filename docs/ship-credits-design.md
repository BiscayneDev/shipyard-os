# SHIP Credits — Buoy Payment Design v1

Status: draft · Sep 2026
Scope: Buoy (x402 API marketplace) + Shipyard OS settlement layer

## 1. Summary

Buoy accepts **two payment rails**: direct **USDC** (standard x402 402-challenge settlement, works today with any x402 client) and **SHIPusd** — a non-transferable, USD-denominated usage credit minted inside Shipyard. Credits are the metering/entitlement layer; USDC is the settlement layer. Downstream services are always paid real USDC over x402 regardless of what the user paid with.

Mercator/MACH analog, but Solana/Base native and with cleaner separation: no transferable credit token, no secondary market, no refund liability.

## 2. Token design

### SHIPusd — the credit

| Property | Choice | Why |
|---|---|---|
| Chain | Solana first (Base second) | x402 settle path + PayBox already Solana |
| Standard | **Token-2022 with `nonTransferable` extension** | Non-transferability enforced by the token program itself — no custom enforcement code, no oracle policing, auditable in one mint config |
| Decimals | 6 (match USDC) | 1 SHIPusd = $1 of tool spend; price math stays integer-safe |
| Transfer | Impossible (program-level) | Not sellable, not farmable, not a de facto security |
| Lifecycle | Mint on acquisition → burn on settlement | Append-only; balance is prepaid liability, accounting trivial |
| Expiry | None by default; optional promo-credit expiry via burn-authority timestamp check | Promos stay promotional |

**SHIPusd is never sent to a user wallet as an asset they hold elsewhere.** It lives in a Shipyard-managed credit account (ATA under the user's wallet or a PDA keyed to it). This keeps "credit" out of wallet UIs and makes burn-on-settle a one-sided operation.

### SHIP — deferred (v2)

The entitlement layer is deliberately out of v1:

- **SHIP Pass (NFT)**: revisit as a **subscription** product later — recurring credit allotments, tiered (Builder/Pro/Fleet). The credit rail doesn't need it; subscriptions are a monetization layer on top once usage is proven.
- **SHIP stake**: staking SOL/USDC → credit streams. Deferred; carries the greyest regulatory framing (access-not-APR must be real). Revisit down the road with counsel.

Neither affects the settlement design below — both would just be additional *acquisition paths* that mint SHIPusd.

## 3. Dual-rail settlement flow

```
Agent ──intent+budget──▶ Shipyard router (Buoy)
                            │
                     search → quote_plan (free, immutable quote,
                     amount fixed in USD with both rails priced)
                            │
              user picks rail: SHIPusd │ USDC
                            │
        ┌───────────────────┴───────────────────┐
   SHIPusd path                          USDC path (x402 standard)
   burn credits from credit              402 challenge → sign → verify
   account against approved_total        balance delta (existing skill flow)
        │                                        │
        └──────────────┬─────────────────────────┘
                       ▼
        Treasury pays downstream x402/MPP service in USDC
        (credit margin stays in treasury)
```

Key rules:

1. **Quotes are rail-agnostic.** A quote is a USD amount + plan; both rails price it identically at quote time (credit may carry a small convenience premium or none — decide: 1:1 recommended at launch).
2. **Burn is bound to the job idempotency key.** One job → one burn → one downstream settle. Replays rejected on the idempotency key, mirroring the x402 tx-hash dedupe.
3. **Downstream always settles in USDC** over the existing x402 flow (402 challenge, `sendTransaction` skipPreflight, balance-delta assertion — per `solana-x402-payments` skill).
4. **Partial jobs refund credits, never USDC movement downstream that didn't happen.** Because credits are ours, refund = mint-back against the job record. USDC path refunds follow the service provider's policy.
5. **Free-tier = credit grants, not payment bypass.** One settlement path, one audit trail. Grants mint SHIPusd the same as purchases.

## 4. Three acquisition models

| | 1. Direct buy | 2. Stake | 3. Pass grant |
|---|---|---|---|
| What | Fiat on-ramp (Apple Pay via PayBox on-ramp surface) or USDC → mint SHIPusd 1:1 | Stake SOL/USDC → credit stream accrues per epoch | SHIP Pass tier mints monthly credit allotment |
| User gets | Immediate credits | Usage without selling principal | Recurring free tier |
| We get | Float + revenue margin | Sticky capital, no yield obligation in dollars | Distribution, loyalty, tier upsell |
| Risk | Regulatorily = prepaid credit (clean) | Must market as access, never APR | Pass must not promise financial return |

PayBox note: on-ramp stays PayBox-powered (MoonPay underneath) — we never integrate MoonPay directly. PayBox converts fiat→USDC, Shipyard mints credits against the confirmed USDC.

## 5. Shipyard OS integration (the differentiator)

- **Execution briefs carry quotes.** When the war room enriches a task brief, tool needs resolve to a Buoy quoted plan (`approved_total`, per-step costs, chosen providers). User approves once — the quote *is* the approval UX, replacing per-tool confirms.
- **Effort dial.** In the brief: model choice + tool budget as sibling controls. "Cheaper model + $0.80 of tools" beats "premium model" — copy Mercator's benchmark framing for our own task suites.
- **Reputation loop.** Completed jobs get agent-verified ratings → Buoy listing ranking → eligible reviewers earn small SHIPusd grants (rewards separated from credit pricing, mirroring Mercator's MACH-review split).
- **Paybox handoff.** "Wallet too light" moments (paybox_onramp candidate) become: top up SHIPusd → job resumes from durable job ID, no re-quote.

## 6. Phasing

**P0 — rail parity (weeks 1–2).** SHIPusd as off-chain ledger credit (DB balance, mint/burn events logged). Dual-rail checkout on Buoy. No chain yet — prove demand and the quote UX. Cheapest possible validation.

**P1 — Token-2022 mint (weeks 3–5).** Deploy SHIPusd mint with `nonTransferable`; credit account = ATA per user; mint on purchase, burn on settle; ledger reconciles to on-chain balances.

**P2 — Base.** Mirror as soulbound ERC-20 credit; USDC (native) settle path via existing x402 Base support.

**P3 — Reputation + rewards.** Ratings, ranking weights, review grants.

**Deferred:** SHIP Pass (as subscription), staking — see §2.

## 7. Risks / open questions

- **Prepaid-credit regulation**: non-transferable, use-only, refundable-if-unspent positioning keeps it out of securities territory; staking is deferred (§2), removing the greyest zone from v1.
- **Credit margin vs. 1:1**: if SHIPusd buys at 1:1 and downstream costs USDC, margin = float + provider spreads. Decide if credits ever get a bonus (buy $10 get $0.50) — that's marketing spend, priced as such.
- **Solana fee noise for tiny burns**: batch burn/settle reconciliations; burns can settle lazily since the ledger is authoritative mid-flight.
- **Token-2022 wallet support**: credits live in Shipyard-managed accounts precisely so users never need a Token-2022-capable wallet UI. Verify no explorer/wallet surprises if users ever see the ATA.
- **MACH comparison**: their moat is Tempo+Stripe distribution. Ours is briefs→quotes→war-room integration and being Solana/Base-native. Don't chase catalog breadth head-on; list Buoy providers *into* Mercator's discovery too (it pays out to any MPP/x402 service) — distribution, not competition, at the catalog layer.
