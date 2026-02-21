-- Add servicesConfig JSONB column to Shop for admin-managed services
ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "servicesConfig" JSONB;

-- Seed existing shop rows with default services
UPDATE "Shop"
SET "servicesConfig" = '[
  {"id":"svc-binding-spiral","name":"Spiral Binding","description":"Coil binding for easy page turning","category":"binding","basePrice":25,"variants":[{"name":"Up to 50 pages","price":25},{"name":"51–100 pages","price":35},{"name":"101–200 pages","price":50}],"isActive":true},
  {"id":"svc-binding-soft","name":"Soft Cover Binding","description":"Thermal glue binding with soft cover","category":"binding","basePrice":60,"variants":[{"name":"Up to 100 pages","price":60},{"name":"101–200 pages","price":80}],"isActive":true},
  {"id":"svc-binding-hard","name":"Hard Cover Binding","description":"Premium hard cover binding","category":"binding","basePrice":150,"variants":[{"name":"Standard","price":150},{"name":"Embossed","price":200}],"isActive":true},
  {"id":"svc-lam-a4","name":"A4 Lamination","description":"Hot lamination for A4 sheets","category":"lamination","basePrice":10,"variants":[{"name":"Single side","price":10},{"name":"Double side","price":18}],"isActive":true},
  {"id":"svc-lam-a3","name":"A3 Lamination","description":"Hot lamination for A3 sheets","category":"lamination","basePrice":18,"variants":[{"name":"Single side","price":18},{"name":"Double side","price":30}],"isActive":true},
  {"id":"svc-id-basic","name":"ID Card Printing","description":"CR80 ID card with custom design","category":"idcard","basePrice":50,"variants":[{"name":"Single sided","price":50},{"name":"Double sided","price":70}],"isActive":true},
  {"id":"svc-poster-a3","name":"A3 Poster Print","description":"Full colour A3 poster on glossy paper","category":"poster","basePrice":80,"variants":[{"name":"Matte finish","price":80},{"name":"Glossy finish","price":100}],"isActive":true},
  {"id":"svc-poster-a2","name":"A2 Poster Print","description":"Full colour A2 poster on glossy paper","category":"poster","basePrice":150,"variants":[{"name":"Matte finish","price":150},{"name":"Glossy finish","price":180}],"isActive":false}
]'::jsonb
WHERE "servicesConfig" IS NULL;
