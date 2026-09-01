import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;

if (!url || !secretKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in .env.local.",
  );
}

const supabase = createClient(url, secretKey, {
  auth: {
    autoRefreshToken: false,
    detectSessionInUrl: false,
    persistSession: false,
  },
});

const { error } = await supabase.storage.updateBucket("business-logos", {
  allowedMimeTypes: [
    "image/png",
    "image/jpeg",
    "image/webp",
    "image/heic",
    "image/heif",
  ],
  fileSizeLimit: 2 * 1024 * 1024,
  public: true,
});

if (error) {
  throw new Error(`Unable to configure business-logos bucket: ${error.message}`);
}

console.log("business-logos bucket configuration is ready.");
