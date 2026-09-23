const DEFAULT_BASE_URL = "https://api.nicholsai.com";

export type EvidenceUnit = {
  ref: string;
  text: string;
  source?: string;
  temporal?: Record<string, unknown>;
  [key: string]: unknown;
};

export type EvidenceRef = {
  ref: string;
  relevance: number;
};

export type OrientResult = {
  evidence: EvidenceRef[];
  model: string;
  method?: string;
  model_version?: number;
  coverage?: number | null;
  usage: {
    input_tokens: number;
    charged_microcents: number;
    balance_microcents: number;
  };
};

export type DeveloperClaim = {
  customer_id: string;
  api_key: string;
  promo_credit_cents: number;
  balance_microcents: number;
};

export type BillingStatus = {
  checkout_enabled: boolean;
  currency: "usd";
  credit_packs_cents: number[];
};

export class GeltreError extends Error {
  readonly status: number | undefined;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "GeltreError";
    this.status = status;
  }
}

export class AuthenticationError extends GeltreError {}
export class PaymentRequiredError extends GeltreError {}
export class ConflictError extends GeltreError {}

function errorForStatus(status: number, message: string): GeltreError {
  if (status === 401) return new AuthenticationError(message, status);
  if (status === 402) return new PaymentRequiredError(message, status);
  if (status === 409) return new ConflictError(message, status);
  return new GeltreError(message, status);
}

export type GeltreOptions = {
  apiKey?: string;
  baseUrl?: string;
  fetch?: typeof fetch;
};

export class Geltre {
  private readonly apiKey: string | undefined;
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: GeltreOptions = {}) {
    this.apiKey = options.apiKey;
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, "");
    this.fetchImpl = options.fetch ?? globalThis.fetch;
    if (!this.fetchImpl) throw new GeltreError("A fetch implementation is required");
  }

  static async claimInvite(
    inviteCode: string,
    options: Omit<GeltreOptions, "apiKey"> = {},
  ): Promise<DeveloperClaim> {
    const client = new Geltre(options);
    return client.request<DeveloperClaim>(
      "POST",
      "/v1/developer/claim",
      { invite_code: inviteCode },
      {},
      false,
    );
  }

  async billingStatus(): Promise<BillingStatus> {
    return this.request<BillingStatus>("GET", "/v1/billing/status", undefined, {}, false);
  }

  async balance(): Promise<{ customer_id: string; balance_microcents: number }> {
    return this.request("GET", "/v1/balance");
  }

  async orient(args: {
    task: string;
    state: EvidenceUnit[];
    budget?: number;
    target?: string;
    idempotencyKey?: string;
  }): Promise<OrientResult> {
    const fallback = Math.random().toString(16).slice(2);
    const generated = globalThis.crypto?.randomUUID?.() ?? fallback;
    const idempotencyKey = args.idempotencyKey ?? ("req_" + generated);

    return this.request<OrientResult>(
      "POST",
      "/v1/orient",
      {
        task: args.task,
        state: args.state,
        budget: args.budget ?? 5,
        target: args.target ?? "decision",
      },
      { "Idempotency-Key": idempotencyKey },
    );
  }

  async createCheckout(creditCents: number): Promise<{ id: string; url: string }> {
    return this.request(
      "POST",
      "/v1/billing/checkout",
      { credit_cents: creditCents },
    );
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    extraHeaders: Record<string, string> = {},
    authenticated = true,
  ): Promise<T> {
    const headers: Record<string, string> = {
      Accept: "application/json",
      ...extraHeaders,
    };

    if (authenticated) {
      if (!this.apiKey) throw new AuthenticationError("Geltre API key is required");
      headers.Authorization = "Bearer " + this.apiKey;
    }

    let serialized: string | undefined;
    if (body !== undefined) {
      serialized = JSON.stringify(body);
      headers["Content-Type"] = "application/json";
    }

    let response: Response;
    try {
      response = await this.fetchImpl(this.baseUrl + path, {
        method,
        headers,
        body: serialized,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new GeltreError("network error: " + message);
    }

    const text = await response.text();
    let payload: unknown = {};
    if (text) {
      try {
        payload = JSON.parse(text);
      } catch {
        if (!response.ok) throw errorForStatus(response.status, "HTTP " + response.status);
        throw new GeltreError("Geltre API returned invalid JSON", response.status);
      }
    }

    if (!response.ok) {
      let message = "HTTP " + response.status;
      if (
        typeof payload === "object" &&
        payload !== null &&
        "error" in payload &&
        typeof (payload as { error?: unknown }).error === "string"
      ) {
        message = (payload as { error: string }).error;
      }
      throw errorForStatus(response.status, message);
    }

    return payload as T;
  }
}

export { DEFAULT_BASE_URL };
