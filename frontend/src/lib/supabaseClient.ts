import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://ebnpuejmwhveetcmparc.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVibnB1ZWptd2h2ZWV0Y21wYXJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1OTE2NjYsImV4cCI6MjA4MDE2NzY2Nn0.IwNaSrQAKr3z6EA7bS8tKe1xbUwVCIZi6hp4bzOn0a4";
console.log(supabaseUrl, supabaseAnonKey);
export const isSupabaseConfigured =
  typeof supabaseUrl === "string" &&
  supabaseUrl.length > 0 &&
  typeof supabaseAnonKey === "string" &&
  supabaseAnonKey.length > 0;

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        detectSessionInUrl: false,
      },
    })
  : null;

export const FLYER_TABLE = "flyer-images";
export const IMAGE_BUCKET = "flyer-images";
