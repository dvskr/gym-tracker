-- Create avatars bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true);

-- Allow users to upload their own avatar
CREATE POLICY "Users can upload own avatar" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow public read access
CREATE POLICY "Public avatar access" ON storage.objects
FOR SELECT USING (bucket_id = 'avatars');

-- Allow users to delete own avatar
CREATE POLICY "Users can delete own avatar" ON storage.objects
FOR DELETE USING (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

