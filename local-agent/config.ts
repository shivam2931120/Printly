export const config = {
  // Supabase connection — use service role key (server-side only, bypasses RLS)
  SUPABASE_URL: process.env.SUPABASE_URL || "https://your-project.supabase.co",
  SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY || "your-service-role-key",

  // Polling
  POLL_INTERVAL_MS: parseInt(process.env.POLL_INTERVAL_MS || "5000", 10),
  BATCH_SIZE: parseInt(process.env.BATCH_SIZE || "20", 10),

  // Which order statuses trigger inventory deduction
  TRIGGER_STATUSES: ["confirmed", "printing"],

  // Consumption rules
  CONSUMPTION: {
    INK_BLACK_PAGES_PER_UNIT: 1000,   // 1 cartridge per 1000 pages
    INK_COLOR_PAGES_PER_UNIT: 500,    // 1 cartridge per 500 pages
    BINDING_COIL_PER_BIND: 1,         // 1 coil per binding job
  },
};
