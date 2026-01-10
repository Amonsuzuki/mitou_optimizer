# 認証機能のセットアップガイド

このガイドでは、Supabaseを使用したGoogle認証機能のセットアップ方法を説明します。

## 必要なもの

- Supabaseアカウント（無料）
- Google Cloudアカウント（無料）
- Cloudflare Workersアカウント

## セットアップ手順

### 1. Supabaseプロジェクトの作成

1. [Supabase Dashboard](https://supabase.com/dashboard)にアクセス
2. 「New Project」をクリックして新しいプロジェクトを作成
3. プロジェクト名、データベースパスワードを設定
4. リージョンを選択（日本の場合は「Northeast Asia (Tokyo)」を推奨）

### 2. Google OAuth Clientの作成

1. [Google Cloud Console](https://console.cloud.google.com/)にアクセス
2. 新しいプロジェクトを作成するか、既存のプロジェクトを選択
3. 左側のメニューから「APIとサービス」→「認証情報」を選択
4. 「認証情報を作成」→「OAuth 2.0 クライアント ID」を選択
5. アプリケーションの種類で「ウェブアプリケーション」を選択
6. 承認済みのリダイレクトURIに以下を追加：
   ```
   https://あなたのプロジェクトID.supabase.co/auth/v1/callback
   ```
7. 「作成」をクリック
8. 表示されたクライアントIDとクライアントシークレットをコピー

### 3. SupabaseでGoogle認証を有効化

1. Supabase Dashboardで作成したプロジェクトを開く
2. 左側のメニューから「Authentication」→「Providers」を選択
3. 「Google」プロバイダーを探してクリック
4. 「Enable Sign in with Google」をオンにする
5. Google Cloud Consoleからコピーした以下の情報を入力：
   - Client ID（クライアントID）
   - Client Secret（クライアントシークレット）
6. 「Save」をクリック

### 4. Supabase APIキーの取得

1. Supabase Dashboardの左側のメニューから「Settings」→「API」を選択
2. 以下の情報をコピー：
   - **Project URL**：`https://xxxxx.supabase.co`の形式
   - **anon/public key**：`eyJ...`で始まる長い文字列

### 5. Cloudflare Workersへの環境変数の設定

#### ローカル開発の場合

1. プロジェクトのルートディレクトリに`.dev.vars`ファイルを作成
2. 以下の内容を記述：
   ```
   SUPABASE_URL=https://xxxxx.supabase.co
   SUPABASE_ANON_KEY=eyJ...
   ```
3. 各自の値に置き換えてください

#### 本番環境の場合

**方法1: wranglerコマンドを使用**
```bash
wrangler secret put SUPABASE_URL
# プロンプトが表示されたら、Supabase URLを入力

wrangler secret put SUPABASE_ANON_KEY
# プロンプトが表示されたら、anon keyを入力
```

**方法2: Cloudflare Dashboardを使用**
1. [Cloudflare Dashboard](https://dash.cloudflare.com/)にアクセス
2. 「Workers & Pages」を選択
3. 該当のWorkerを選択
4. 「Settings」→「Variables」を選択
5. 「Add variable」をクリックして以下を追加：
   - 変数名：`SUPABASE_URL`、値：SupabaseプロジェクトのURL
   - 変数名：`SUPABASE_ANON_KEY`、値：Supabaseのanon key
6. 「Save and Deploy」をクリック

### 6. リダイレクトURIの追加（本番環境用）

Workerをデプロイした後、Supabaseの設定にWorkerのURLを追加します。

1. Supabase Dashboardで「Authentication」→「Providers」→「Google」を開く
2. Google Cloud Consoleに戻る
3. 作成したOAuth 2.0クライアントIDを編集
4. 承認済みのリダイレクトURIに以下を追加：
   ```
   https://あなたのワーカー名.あなたのサブドメイン.workers.dev/api/auth/callback
   ```
5. 「保存」をクリック

### 7. 動作確認

1. ローカル環境で確認する場合：
   ```bash
   npm install
   npm run dev
   ```
   ブラウザで`http://localhost:8787`を開く

2. 「Sign in with Google」ボタンをクリック
3. Googleアカウントでログイン
4. 認証が成功すると、メインページにリダイレクトされます
5. ユーザー情報が表示されることを確認
6. 下書き保存機能が使えることを確認

## トラブルシューティング

### エラー：「Google OAuth not configured」

**原因**：環境変数が正しく設定されていない

**解決方法**：
- `.dev.vars`ファイルが存在し、正しい値が設定されているか確認
- Cloudflare Workersの環境変数が正しく設定されているか確認

### エラー：「Failed to exchange code for session」

**原因**：リダイレクトURIが正しく設定されていない、またはGoogle OAuthの設定が間違っている

**解決方法**：
- SupabaseとGoogle Cloud ConsoleのリダイレクトURIが一致しているか確認
- Google Cloud ConsoleでOAuth同意画面が正しく設定されているか確認

### エラー：「Invalid session」

**原因**：トークンの有効期限が切れている、または無効なトークン

**解決方法**：
- ログアウトして再度ログイン
- ブラウザのLocalStorageをクリア

## 参考リンク

- [Supabase Authentication Documentation](https://supabase.com/docs/guides/auth)
- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [参考記事](https://zenn.dev/micchi55555/articles/7f0bef8ec5ebbf)
