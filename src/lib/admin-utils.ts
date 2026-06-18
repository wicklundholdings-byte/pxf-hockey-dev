import { supabase } from "@/integrations/supabase/client";

export function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export async function uploadToBucket(
  bucket: "drill-videos" | "drill-thumbnails" | "category-images" | "program-images",
  file: File,
): Promise<string> {
  const ext = file.name.split(".").pop() ?? "bin";
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type,
  });
  if (error) throw error;
  return `${bucket}/${path}`;
}

export async function signedUrl(storagePath: string | null | undefined, expiresSec = 3600): Promise<string | null> {
  if (!storagePath) return null;
  const [bucket, ...rest] = storagePath.split("/");
  if (!bucket || rest.length === 0) return null;
  const { data } = await supabase.storage.from(bucket).createSignedUrl(rest.join("/"), expiresSec);
  return data?.signedUrl ?? null;
}