-- Create a storage bucket for prints if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('prints', 'prints', true)
ON CONFLICT (id) DO NOTHING;

-- Policy to allow public uploads (INSERT) to 'prints' bucket
create policy "Public Uploads"
on storage.objects for insert
with check ( bucket_id = 'prints' );

-- Policy to allow public viewing (SELECT) of 'prints' bucket
create policy "Public Select"
on storage.objects for select
using ( bucket_id = 'prints' );

-- Policy to allow public updates (UPDATE) - Optional, maybe needed if re-uploading
create policy "Public Updates"
on storage.objects for update
with check ( bucket_id = 'prints' );
