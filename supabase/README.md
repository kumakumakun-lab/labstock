# LabStock グループ共有バックエンド（Supabase）セットアップ

招待コードで複数端末から同じグループの在庫を共有できるようにするための手順です。
ログインは不要で、端末ごとのID（device_id）と招待コードでアクセス制御します。

## 構成
- **DB / API**: Supabase（PostgreSQL）
- **アクセス制御**: 各テーブルは RLS で直接アクセスを全面遮断。操作はすべて
  `migrations/0001_init_groups.sql` で定義した RPC 関数経由で、メンバーシップを
  検証してから実行する（anon キーがアプリに埋め込まれても、自分が作成/参加した
  グループ以外は読み書きできない）。
- **クライアント**: `lib/supabase.ts`（クライアント）、`lib/device-id.ts`（端末ID）、
  `lib/group-storage.ts`（RPC 呼び出し層）。

## セットアップ手順

### 1. DB スキーマを作成する（1回だけ）
1. Supabase ダッシュボード → 対象プロジェクト → **SQL Editor** を開く
2. `supabase/migrations/0001_init_groups.sql` の**全文をコピペ**して **Run**
3. エラーなく完了すれば、テーブルと RPC 関数が作成される
   （Table Editor に groups / group_members / group_items / group_activity_logs が出る）

### 2. 環境変数（プロジェクト直下の `.env` に設定済み）
```
EXPO_PUBLIC_SUPABASE_URL=https://fdakoxryaxsqsowwphtk.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=（anon public キー）
```
> anon キーは RLS/RPC で保護される公開鍵のため、クライアント埋め込みは安全。
> `service_role` キーは絶対にアプリ/リポジトリへ入れないこと。

### 3. 依存パッケージのインストール
```bash
pnpm install   # @supabase/supabase-js と react-native-url-polyfill が追加済み
```

### 4. 本番(EAS)ビルドで環境変数を有効にする
ローカルは `.env` で読まれるが、EAS 本番ビルドにも同じ2変数を登録する：
```bash
eas env:create --name EXPO_PUBLIC_SUPABASE_URL --value "https://fdakoxryaxsqsowwphtk.supabase.co" --environment production --visibility plaintext
eas env:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "（anon キー）" --environment production --visibility plaintext
```
（ダッシュボード expo.dev → プロジェクト → Environment variables からでも可）

### 5. 動作確認（2端末）
1. 端末Aでグループ作成 → 表示された招待コードを控える
2. 端末B（別のシミュレータ/実機）で同じ招待コードで参加
3. 端末Aで在庫を追加 → 端末Bで（再読み込みで）見えれば成功

## 補足・今後
- **画像共有**: `group_items.image_url` 列と `imageUrl` フィールドは用意済みだが、
  グループ在庫の画像アップロードUIは未実装（Supabase Storage バケットを使って後日対応）。
- **リアルタイム反映**: 現状は画面フォーカス時に再取得。Supabase Realtime で
  即時反映に拡張可能（任意）。
