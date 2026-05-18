-- Create/update the storage bucket for print uploads.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'prints',
  'prints',
  true,
  52428800,
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/bmp',
    'image/tiff',
    'image/webp',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Authenticated Print Uploads" ON storage.objects;
DROP POLICY IF EXISTS "Public Uploads" ON storage.objects;
DROP POLICY IF EXISTS "Public Select" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Print Updates" ON storage.objects;
DROP POLICY IF EXISTS "Public Updates" ON storage.objects;

-- Signed-in users may upload print files.
CREATE POLICY "Authenticated Print Uploads"
on storage.objects for insert
with check ( bucket_id = 'prints' and auth.role() = 'authenticated' );

-- Print files are accessed by public URL after upload.
CREATE POLICY "Public Select"
on storage.objects for select
using ( bucket_id = 'prints' );

-- Signed-in users may update print files.
CREATE POLICY "Authenticated Print Updates"
on storage.objects for update
using ( bucket_id = 'prints' and auth.role() = 'authenticated' )
with check ( bucket_id = 'prints' and auth.role() = 'authenticated' );
