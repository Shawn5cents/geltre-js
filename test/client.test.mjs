import assert from "node:assert/strict";
import test from "node:test";
import {
  AuthenticationError,
  ConflictError,
  Geltre,
} from "../dist/index.js";

test("orient sends auth and idempotency headers", async () => {
  let captured;
  const client = new Geltre({
    apiKey: "gt_test_fixture_key",
    fetch: async (url, init) => {
      captured = { url, init };
      return new Response(
        JSON.stringify({
          evidence: [{ ref: "context:2", relevance: 0.99 }],
          model: "geltre-serviceops-linear-v03",
          usage: {
            input_tokens: 12,
            charged_microcents: 60,
            balance_microcents: 99999940,
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    },
  });

  const result = await client.orient({
    task: "Determine whether the target service should restart after failure",
    state: [
      {
        ref: "context:2",
        source: "context",
        text: "target service failed after the latest start attempt",
      },
    ],
    budget: 1,
    idempotencyKey: "req_fixture",
  });

  assert.equal(captured.url, "https://api.nicholsai.com/v1/orient");
  assert.equal(captured.init.headers.Authorization, "Bearer gt_test_fixture_key");
  assert.equal(captured.init.headers["Idempotency-Key"], "req_fixture");
  assert.equal(result.evidence[0].ref, "context:2");
});

test("claimInvite does not send API auth", async () => {
  let captured;
  const result = await Geltre.claimInvite("gti_fixture", {
    fetch: async (url, init) => {
      captured = { url, init };
      return new Response(
        JSON.stringify({
          customer_id: "cus_fixture",
          api_key: "gt_test_fixture_key",
          promo_credit_cents: 100,
          balance_microcents: 100000000,
        }),
        { status: 201, headers: { "Content-Type": "application/json" } },
      );
    },
  });

  assert.equal(captured.init.headers.Authorization, undefined);
  assert.equal(result.promo_credit_cents, 100);
});

test("missing API key fails before network", async () => {
  const client = new Geltre({
    fetch: async () => {
      throw new Error("should not be called");
    },
  });
  await assert.rejects(() => client.balance(), AuthenticationError);
});

test("409 maps to ConflictError", async () => {
  const client = new Geltre({
    apiKey: "gt_test_fixture_key",
    fetch: async () =>
      new Response(
        JSON.stringify({ error: "developer invite already claimed" }),
        { status: 409, headers: { "Content-Type": "application/json" } },
      ),
  });
  await assert.rejects(() => client.balance(), ConflictError);
});
