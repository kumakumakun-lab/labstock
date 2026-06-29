import "react-native-url-polyfill/auto";
import { createClient } from "@supabase/supabase-js";

/**
 * Supabase クライアント（グループ共有バックエンド用）
 *
 * ログイン機能は使わないため、認証セッションの永続化は無効化している。
 * グループ操作はすべて SECURITY DEFINER の RPC 関数経由で行い、
 * 端末ID(device_id)＋招待コードでアクセス制御する（supabase/migrations 参照）。
 */
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

/** URL と anon キーが設定済みか（未設定ならグループ共有は動かない） */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  console.warn(
    "[Supabase] EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY が未設定です。グループ共有機能は動作しません。",
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});
