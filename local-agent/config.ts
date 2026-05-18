const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

export const config = {
  // Supabase connection — use service role key (server-side only, bypasses RLS)
  SUPABASE_URL: process.env.SUPABASE_URL || "",
  SUPABASE_SERVICE_KEY: supabaseServiceKey || "",

  // Polling
  POLL_INTERVAL_MS: parseInt(process.env.POLL_INTERVAL_MS || "5000", 10),
  BATCH_SIZE: parseInt(process.env.BATCH_SIZE || "20", 10),
  MAX_JOB_ATTEMPTS: parseInt(process.env.MAX_JOB_ATTEMPTS || "3", 10),

  // Which order statuses trigger inventory deduction
  TRIGGER_STATUSES: ["CONFIRMED", "PRINTING"],

  // Consumption rules
  CONSUMPTION: {
    INK_BLACK_PAGES_PER_UNIT: 1000,   // 1 cartridge per 1000 pages
    INK_COLOR_PAGES_PER_UNIT: 500,    // 1 cartridge per 500 pages
    BINDING_COIL_PER_BIND: 1,         // 1 coil per binding job
  },
};

export function validateConfig() {
  const missing = [
    !config.SUPABASE_URL && "SUPABASE_URL",
    !config.SUPABASE_SERVICE_KEY && "SUPABASE_SERVICE_ROLE_KEY",
  ].filter(Boolean);

  if (missing.length > 0) {
    throw new Error(`[Agent] Missing required environment variable(s): ${missing.join(", ")}`);
  }
}
