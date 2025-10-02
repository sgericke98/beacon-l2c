import { supabaseAdmin } from "./supabaseAdmin";

export type TokenBundle = {
  access_token: string;
  refresh_token: string;
  instance_url: string;
  issued_at?: string;
  token_type?: string;
};

const TABLE = "integration_tokens";
const PROVIDER = "salesforce";

function assertTenantId(tenantId: string | undefined): asserts tenantId is string {
  if (!tenantId) {
    throw new Error("Organization id is required for Salesforce token operations");
  }
}

export const sfTokenStore = {
  async get(tenantId: string): Promise<TokenBundle | null> {
    assertTenantId(tenantId);
    const { data, error } = await (supabaseAdmin as any)
      .from(TABLE)
      .select("token")
      .eq("provider", PROVIDER)
      .eq("tenant_id", tenantId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to read Salesforce tokens: ${error.message}`);
    }

    return (data?.token as TokenBundle | null) ?? null;
  },

  async set(tenantId: string, token: TokenBundle) {
    assertTenantId(tenantId);
    const { error } = await (supabaseAdmin as any)
      .from(TABLE)
      .upsert(
        {
          provider: PROVIDER,
          tenant_id: tenantId,
          token,
        },
        { onConflict: "provider,tenant_id" }
      );

    if (error) {
      throw new Error(`Failed to persist Salesforce tokens: ${error.message}`);
    }
  },

  async clear(tenantId: string) {
    assertTenantId(tenantId);
    const { error } = await (supabaseAdmin as any)
      .from(TABLE)
      .delete()
      .eq("provider", PROVIDER)
      .eq("tenant_id", tenantId);

    if (error) {
      throw new Error(`Failed to clear Salesforce tokens: ${error.message}`);
    }
  },
};
