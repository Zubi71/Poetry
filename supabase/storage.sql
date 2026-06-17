-- Storage buckets for Urdu Poetry
-- Run in Supabase Dashboard → SQL Editor

INSERT INTO storage.buckets (id, name, public) VALUES
  ('avatars', 'avatars', true),
  ('poem-images', 'poem-images', true)
ON CONFLICT (id) DO NOTHING;

-- Avatars: public read, users upload to own folder
CREATE POLICY "Avatar images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update own avatar"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own avatar"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Poem images: public read, authenticated upload
CREATE POLICY "Poem images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'poem-images');

CREATE POLICY "Authenticated users can upload poem images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'poem-images' AND auth.role() = 'authenticated');
