# Geltre TypeScript / JavaScript SDK

Official TypeScript/JavaScript client for **Geltre**, the Orienting Model by [Nichols AI](https://nicholsai.com/#geltre).

> Geltre selects what matters before AI decides what to do.

This repository contains **client SDK code only**. The Geltre model, weights, training system, private datasets, and production inference implementation are proprietary and are not included here.

## Install

Until the first npm release is published, install from GitHub:

```bash
npm install github:Shawn5cents/geltre-js
```

Node.js 18+ is supported. The runtime SDK has no third-party dependencies.

## Quick start

```js
import { Geltre } from "@nichols-ai/geltre";

const client = new Geltre({
  apiKey: process.env.GELTRE_API_KEY,
});

const result = await client.orient({
  task: "Determine whether the target service should restart after failure",
  state: [
    {
      ref: "context:1",
      source: "context",
      text: "target service expected mode running; restart policy on failure",
    },
    {
      ref: "context:2",
      source: "context",
      text: "target service failed after the latest start attempt",
    },
    { ref: "status:1", source: "status", text: "unit status exit code 1" },
    {
      ref: "meta:1",
      source: "meta",
      text: "distractor service backup completed successfully",
    },
  ],
  budget: 2,
});

console.log(result.evidence);
```

## Developer preview invite

```js
import { Geltre } from "@nichols-ai/geltre";

const claim = await Geltre.claimInvite("gti_...");
console.log(claim.api_key); // store securely; shown once
```

Approved preview accounts currently receive $1 of promotional credit.

## API surface

- `client.orient(...)`
- `client.balance()`
- `client.billingStatus()`
- `client.createCheckout(...)`
- `Geltre.claimInvite(...)`

Full docs: https://docs.nicholsai.com/introduction/

## Preview scope

The hosted preview is currently scoped to the validated ServiceOps selector. Nichols AI does **not** claim universal cross-domain robustness. Published benchmark docs include the negative CodeOps cross-distribution result.

## Development

```bash
npm install
npm test
```

## License

The SDK source in this repository is MIT licensed.

The hosted Geltre model and related proprietary model assets are **not** licensed under MIT and are not distributed in this repository.
