-- sql/storage/05-storage-policies.sql

-- avatars: chỉ upload vào thư mục {user_id}/ của chính mình
CREATE POLICY "avatars_insert_own"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- avatars: ai cũng đọc được (public bucket)
CREATE POLICY "avatars_select_public"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

-- post-images: chỉ upload vào thư mục {user_id}/ của chính mình
CREATE POLICY "post_images_insert_own"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'post-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- post-images: ai cũng đọc được
CREATE POLICY "post_images_select_public"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'post-images');
