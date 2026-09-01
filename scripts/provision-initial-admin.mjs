import { createClient } from "@supabase/supabase-js";

const INITIAL_ADMIN_AUTH_USER_ID = "069a1ac3-ee30-4dd8-905c-d1deaf42de3b";
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

const {
  data: { user },
  error: userError,
} = await supabase.auth.admin.getUserById(INITIAL_ADMIN_AUTH_USER_ID);

if (userError || !user) {
  throw new Error(
    `Auth user ${INITIAL_ADMIN_AUTH_USER_ID} was not found in the configured Supabase project.`,
  );
}

const { error: profileError } = await supabase.from("admin_profiles").upsert(
  {
    auth_user_id: INITIAL_ADMIN_AUTH_USER_ID,
    display_name: "Administrator",
    role: "ADMIN",
  },
  { onConflict: "auth_user_id" },
);

if (profileError) {
  throw new Error(`Unable to provision initial admin: ${profileError.message}`);
}

console.log(`Initial admin profile is ready for ${INITIAL_ADMIN_AUTH_USER_ID}.`);
