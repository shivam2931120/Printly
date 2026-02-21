-- Add shopConfig JSONB column to Shop table for persisting all shop settings
ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "shopConfig" JSONB;

-- Seed existing shop rows with default config
UPDATE "Shop"
SET "shopConfig" = '{
  "shopName": "Printly",
  "tagline": "College Print Shop",
  "operatingHours": "9:00 AM - 6:00 PM (Mon-Sat)",
  "location": "Akshaya RVITM Hostel, Bangalore",
  "contact": "+91 8618719375",
  "email": "shivam.bgp@outlook.com",
  "directionsUrl": "https://maps.app.goo.gl/94RRjuc1whqWUmWQ7",
  "mapEmbed": "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3889.7011850547046!2d77.57056058243771!3d12.86256658490096!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bae6bcd0e5f7aa9%3A0x6505152e96e305c7!2sAkshaya%20RVITM%20Hostel!5e0!3m2!1sen!2sin!4v1771305566041!5m2!1sen!2sin",
  "shopId": "default",
  "isActive": true
}'::jsonb
WHERE "shopConfig" IS NULL;
