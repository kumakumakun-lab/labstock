# LabStock アプリ App Store リリース完全ガイド

> 本ガイドは、LabStock（研究室備品・薬品在庫管理アプリ）をiOS App Storeに公開するための全手順を、初めての方でもわかるように一つ一つ丁寧に解説したものです。

---

## 目次

1. [全体の流れを理解する](#1-全体の流れを理解する)
2. [STEP 1: Apple Developer Program に登録する](#step-1-apple-developer-program-に登録する)
3. [STEP 2: Expo アカウントを作成する](#step-2-expo-アカウントを作成する)
4. [STEP 3: AdMob（広告）の本番設定を行う](#step-3-admob広告の本番設定を行う)
5. [STEP 4: プライバシーポリシーを準備する](#step-4-プライバシーポリシーを準備する)
6. [STEP 5: アプリのビルド（IPA ファイル生成）](#step-5-アプリのビルドipa-ファイル生成)
7. [STEP 6: App Store Connect でアプリ情報を登録する](#step-6-app-store-connect-でアプリ情報を登録する)
8. [STEP 7: スクリーンショットを準備する](#step-7-スクリーンショットを準備する)
9. [STEP 8: アプリを App Store Connect に提出する](#step-8-アプリを-app-store-connect-に提出する)
10. [STEP 9: 審査を申請する](#step-9-審査を申請する)
11. [STEP 10: 審査結果への対応](#step-10-審査結果への対応)
12. [よくあるリジェクト理由と対策](#よくあるリジェクト理由と対策)
13. [費用まとめ](#費用まとめ)
14. [参考リンク集](#参考リンク集)

---

## 1. 全体の流れを理解する

App Storeにアプリを公開するまでの全体像を把握しておくと、各ステップの意味がわかりやすくなります。大きく分けると以下の10ステップで進めます。

| ステップ | 内容 | 所要時間の目安 |
|---------|------|-------------|
| STEP 1 | Apple Developer Program に登録 | 1〜7日（審査含む） |
| STEP 2 | Expo アカウント作成 | 5分 |
| STEP 3 | AdMob 本番広告IDの設定 | 30分〜1時間 |
| STEP 4 | プライバシーポリシーの準備 | 1〜2時間 |
| STEP 5 | アプリのビルド（IPA生成） | 15〜30分 |
| STEP 6 | App Store Connect でアプリ情報登録 | 1〜2時間 |
| STEP 7 | スクリーンショットの準備 | 1〜2時間 |
| STEP 8 | ビルドを App Store Connect に提出 | 10〜30分 |
| STEP 9 | 審査を申請 | 5分 |
| STEP 10 | 審査結果への対応 | 1〜3日（Apple側の審査） |

全体を通して、**初回は1〜2週間程度**を見込んでおくと安心です。2回目以降のアップデートは、STEP 5〜10の繰り返しとなり、数時間で完了できます。

---

## STEP 1: Apple Developer Program に登録する

App Storeにアプリを公開するには、**Apple Developer Program**（年間 $99 / 約15,000円）への加入が必須です [1]。これはAppleがアプリの品質と安全性を担保するための仕組みで、登録料以外にアプリの審査料や公開料は一切かかりません [2]。

### 1-1. 事前に準備するもの

| 必要なもの | 詳細 |
|-----------|------|
| **Apple ID** | 2ファクタ認証が有効になっていること。まだ持っていない場合は [appleid.apple.com](https://appleid.apple.com) で作成 |
| **本人確認書類** | パスポートが最も成功率が高い。運転免許証でも可能な場合がある [3] |
| **クレジットカード** | 年間登録料の支払いに使用 |
| **iPhone または iPad** | Apple Developer アプリでの登録に使用（推奨） |

### 1-2. 登録手順（Apple Developer アプリ経由 — 推奨）

**なぜアプリ経由が推奨なのか？** Web経由よりもスムーズに本人確認が完了し、価格もApple Developer App経由の方が安くなる場合があります [3]。

1. **Apple Developer アプリをインストールする**
   - iPhone または iPad の App Store で「Apple Developer」と検索し、Appleの公式アプリをインストールします。

2. **Apple ID でサインインする**
   - アプリを起動し、画面下部の「アカウント」タブをタップします。
   - お持ちの Apple ID でサインインしてください。

3. **「今すぐ登録」をタップする**
   - サインイン後、「Apple Developer Program に登録」というセクションが表示されます。
   - 「今すぐ登録」ボタンをタップします。

4. **個人情報を入力する**
   - 氏名（ローマ字）、住所、電話番号などを正確に入力します。
   - **重要**: Apple ID に登録されている名前と一致させてください。不一致があると審査に時間がかかります。

5. **本人確認を行う**
   - 画面の指示に従い、本人確認書類（パスポート推奨）をカメラで撮影します。
   - 顔写真の撮影を求められる場合もあります。

6. **登録料を支払う**
   - 年間 $99（日本円で約15,000円前後、為替レートにより変動）をクレジットカードで支払います。

7. **審査を待つ**
   - Appleが本人確認を行います。通常 **24時間〜48時間** で完了しますが、追加確認が必要な場合は最大1週間程度かかることがあります [4]。
   - 完了すると、登録メールアドレスに確認メールが届きます。

### 1-3. 登録が完了したら確認すること

登録完了後、[Apple Developer ポータル](https://developer.apple.com/account/) にサインインし、以下が表示されることを確認してください。

- 「Membership」セクションに「Apple Developer Program」と表示されている
- 有効期限が1年後の日付になっている
- 「Certificates, Identifiers & Profiles」にアクセスできる

---

## STEP 2: Expo アカウントを作成する

LabStockアプリはExpo（React Native）で開発されているため、ビルドとApp Storeへの提出には **Expo Application Services（EAS）** を使用します [5]。

### 2-1. Expo アカウントの作成

1. [expo.dev](https://expo.dev/signup) にアクセスします。
2. メールアドレス、ユーザー名、パスワードを入力してアカウントを作成します。
3. メール認証を完了させます。

### 2-2. EAS CLI のインストールとログイン

お使いのパソコン（Mac / Windows / Linux）のターミナル（コマンドプロンプト）で以下のコマンドを実行します。

```bash
# EAS CLI をグローバルにインストール
npm install -g eas-cli

# Expo アカウントにログイン
eas login
```

ログインコマンドを実行すると、ユーザー名とパスワードの入力を求められます。先ほど作成したExpoアカウントの情報を入力してください。

---

## STEP 3: AdMob（広告）の本番設定を行う

LabStockアプリにはバナー広告機能が組み込まれています。App Storeに公開する前に、Google AdMobで本番用の広告ユニットIDを取得し、アプリに設定する必要があります。

### 3-1. Google AdMob アカウントの作成

1. [Google AdMob](https://admob.google.com/) にアクセスし、Googleアカウントでサインインします。
2. 「始める」をクリックし、AdMobアカウントを作成します。
3. 支払い情報（銀行口座）を登録します。これは広告収益の受け取りに必要です。

### 3-2. AdMob でアプリを登録する

1. AdMob ダッシュボードで「アプリ」→「アプリを追加」をクリックします。
2. プラットフォームは「iOS」を選択します。
3. 「App Storeで公開済みですか？」には「いいえ」を選択します（まだ公開前のため）。
4. アプリ名に「LabStock」と入力し、「追加」をクリックします。

### 3-3. バナー広告ユニットを作成する

1. 追加したアプリの画面で「広告ユニット」→「広告ユニットを追加」をクリックします。
2. 「バナー」を選択します。
3. 広告ユニット名に「LabStock_Banner_Bottom」など、わかりやすい名前を付けます。
4. 「広告ユニットを作成」をクリックします。
5. 表示される **広告ユニットID**（`ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY` の形式）をメモしておきます。

### 3-4. アプリに広告IDを設定する

取得した広告ユニットIDを、アプリのバナー広告コンポーネントに設定します。現在のLabStockアプリでは、`components/banner-ad.tsx` にプレースホルダーが設定されているため、ここを本番IDに差し替えます。

また、`react-native-google-mobile-ads` パッケージをインストールし、`app.config.ts` にAdMobのアプリIDを追加する必要があります。

```bash
# Google Mobile Ads SDK をインストール
npx expo install react-native-google-mobile-ads
```

```typescript
// app.config.ts の plugins に追加
[
  "react-native-google-mobile-ads",
  {
    androidAppId: "ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY",
    iosAppId: "ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY",
  },
]
```

### 3-5. App Tracking Transparency（ATT）対応

iOS 14.5以降、広告トラッキングにはユーザーの許可が必要です [6]。LabStockアプリでAdMobを使用する場合、ATTダイアログを表示する設定を追加してください。

```bash
npx expo install expo-tracking-transparency
```

アプリ起動時に以下のようなコードでトラッキング許可を求めます。

```typescript
import { requestTrackingPermissionsAsync } from 'expo-tracking-transparency';

// アプリ起動時に呼び出す
const { status } = await requestTrackingPermissionsAsync();
```

---

## STEP 4: プライバシーポリシーを準備する

App Storeに公開するアプリには、**プライバシーポリシーの掲載が必須**です [7]。特にAdMob広告を使用するアプリでは、広告ネットワークによるデータ収集について明記する必要があります [8]。

### 4-1. プライバシーポリシーに含めるべき内容

| 項目 | 記載内容 |
|------|---------|
| **収集するデータ** | アプリが収集する情報の種類（在庫データ、画像、ユーザー名など） |
| **データの保存場所** | LabStockはローカル保存のため「端末内にのみ保存」と明記 |
| **第三者への提供** | AdMobによる広告配信のためのデータ収集について記載 |
| **広告ネットワーク** | Google AdMobを使用していること、Googleのプライバシーポリシーへのリンク |
| **ユーザーの権利** | データの削除方法（アプリのアンインストールで全データ削除） |
| **連絡先** | 問い合わせ先のメールアドレス |

### 4-2. プライバシーポリシーの公開方法

プライバシーポリシーは **インターネット上でアクセスできるURL** として公開する必要があります。以下のいずれかの方法で公開できます。

**方法A: GitHub Pages（無料・推奨）**

1. GitHubアカウントを作成（既にあればスキップ）
2. 新しいリポジトリを作成（例: `labstock-privacy`）
3. `index.html` にプライバシーポリシーの内容を記述
4. Settings → Pages で GitHub Pages を有効化
5. 公開されたURL（例: `https://yourname.github.io/labstock-privacy/`）をメモ

**方法B: Notion（無料）**

1. Notionでプライバシーポリシーのページを作成
2. 「Share」→「Publish to web」で公開
3. 公開URLをメモ

**方法C: 自分のWebサイト**

既にWebサイトをお持ちの場合は、そこにプライバシーポリシーのページを追加するのが最も簡単です。

---

## STEP 5: アプリのビルド（IPA ファイル生成）

ここからが実際のビルド作業です。LabStockアプリのソースコードから、App Storeに提出可能な **IPA ファイル**（iOSアプリのインストールファイル）を生成します。

### 5-1. Manus の Publish ボタンを使う方法（最も簡単）

Manusのプロジェクト管理画面から直接ビルドを生成できます。

1. Manusのチャット画面で、最新のチェックポイントカードを確認します。
2. カード上部の **「Publish」ボタン** をクリックします。
3. ビルドが自動的に開始され、完了するとIPAファイルがダウンロード可能になります。

### 5-2. EAS Build を使う方法（コマンドライン）

より細かい制御が必要な場合は、EAS CLIを使ってビルドを行います。

**eas.json の設定**

プロジェクトのルートに `eas.json` ファイルを作成します（既に存在する場合は編集）。

```json
{
  "cli": {
    "version": ">= 13.0.0"
  },
  "build": {
    "production": {
      "ios": {
        "distribution": "store",
        "autoIncrement": true
      }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "ascAppId": "あとで設定するApp Store ConnectのアプリID"
      }
    }
  }
}
```

**ビルドコマンドの実行**

```bash
# プロジェクトディレクトリに移動
cd /path/to/labstock

# iOS用のプロダクションビルドを開始
eas build --platform ios --profile production
```

初回ビルド時には以下の質問が表示されます。

| 質問 | 回答 |
|------|------|
| Would you like to log in to your Apple account? | **Yes** → Apple IDとパスワードを入力 |
| Would you like to generate a new Apple Distribution Certificate? | **Yes** |
| Would you like to generate a new Apple Provisioning Profile? | **Yes** |

ビルドには通常 **15〜30分** かかります。完了すると、EASのダッシュボード（expo.dev）からIPAファイルをダウンロードできます。

---

## STEP 6: App Store Connect でアプリ情報を登録する

ビルドの完了を待つ間に、App Store Connectでアプリの情報を登録しておきましょう。

### 6-1. App Store Connect にアクセスする

1. [App Store Connect](https://appstoreconnect.apple.com/) にアクセスします。
2. Apple Developer Program に登録した Apple ID でサインインします。

### 6-2. 新しいアプリを作成する

1. 「マイApp」をクリックします。
2. 左上の **「+」ボタン** → **「新規App」** をクリックします。
3. 以下の情報を入力します。

| 項目 | 入力内容 | 説明 |
|------|---------|------|
| **プラットフォーム** | iOS にチェック | iOSアプリとして登録 |
| **名前** | LabStock | App Storeに表示されるアプリ名（30文字以内、他アプリと重複不可） |
| **プライマリ言語** | 日本語 | アプリの主要言語 |
| **バンドルID** | ドロップダウンから選択 | ビルド時に自動登録されたバンドルIDを選択 |
| **SKU** | labstock-inventory | 内部管理用の識別子（ユーザーには見えない） |
| **ユーザーアクセス** | フルアクセス | チーム全員がアクセス可能 |

4. **「作成」** をクリックします。

### 6-3. アプリ情報を入力する

作成後、アプリの詳細情報を入力していきます。左側のメニューから各セクションにアクセスできます。

**「App情報」セクション**

| 項目 | 入力内容 |
|------|---------|
| **名前** | LabStock |
| **サブタイトル** | 研究室の備品・薬品在庫管理 |
| **カテゴリ** | プライマリ: 「ビジネス」、セカンダリ: 「仕事効率化」 |
| **コンテンツの権利** | 「このAppに第三者のコンテンツは含まれていません」を選択 |
| **年齢制限** | 質問に回答（暴力・成人向けコンテンツなし → 4+） |

**「価格および配信状況」セクション**

| 項目 | 入力内容 |
|------|---------|
| **価格** | 無料（0円） |
| **配信する国/地域** | 日本（必要に応じて他の国も選択） |

**「Appのプライバシー」セクション**

ここが特に重要です。AdMob広告を使用しているため、正確に回答する必要があります。

1. 「プライバシーポリシーURL」に、STEP 4 で準備したURLを入力します。
2. 「データ収集」の質問に回答します。

| 質問 | 回答 | 理由 |
|------|------|------|
| データを収集していますか？ | **はい** | AdMobが広告配信のためにデータを収集する |
| 収集するデータの種類 | 「使用状況データ」「診断」 | AdMobが収集する情報 |
| データの使用目的 | 「サードパーティ広告」 | AdMobによる広告表示のため |
| ユーザーにリンクされますか？ | **いいえ** | LabStockはユーザー認証を使用しない |

### 6-4. バージョン情報を入力する

左メニューの「iOS App」セクションで、リリースするバージョンの情報を入力します。

| 項目 | 入力内容の例 |
|------|------------|
| **プロモーションテキスト** | 研究室の備品・薬品をスマートに管理。バーコードスキャン、在庫アラート、Excel出力に対応。 |
| **概要（説明文）** | 下記参照 |
| **キーワード** | 在庫管理,研究室,備品,薬品,ラボ,実験室,バーコード,在庫,管理,アラート |
| **サポートURL** | プライバシーポリシーと同じURL、または別途用意したサポートページ |
| **マーケティングURL** | （任意）アプリの紹介ページがあれば |
| **ビルド** | STEP 8 で提出後に選択可能になる |

**概要（説明文）の例:**

```
LabStockは、研究室の備品・薬品の在庫を簡単に管理できるアプリです。

【主な機能】
■ 在庫一覧管理
企業名、型番、個数、画像を登録して、研究室の全備品を一元管理できます。

■ バーコード/QRコードスキャン
カメラでバーコードやQRコードを読み取り、型番を自動入力。登録作業を大幅に効率化します。

■ 在庫アラート
物品ごとに閾値を設定し、在庫が少なくなると通知でお知らせ。発注忘れを防ぎます。

■ カテゴリ管理
備品・薬品・消耗品など、自由にカテゴリを作成してタグ付け。フィルタリングで素早く検索できます。

■ 変更ログ
誰が、いつ、何を変更したかを自動記録。複数人での在庫管理も安心です。

■ Excel出力
現在の在庫状況をExcelファイルとして出力。報告書作成や発注業務に活用できます。

■ ダークモード対応
目に優しいダークモードに切り替え可能。夜間の作業も快適です。

データはすべて端末内に保存されるため、インターネット接続なしで利用でき、
研究データのセキュリティも安心です。
```

---

## STEP 7: スクリーンショットを準備する

App Storeに掲載するスクリーンショットは、ユーザーがアプリをダウンロードするかどうかを判断する重要な要素です。以下のサイズのスクリーンショットが必要です [9]。

### 7-1. 必要なスクリーンショットのサイズ

| デバイス | サイズ（ピクセル） | 必須/任意 |
|---------|-----------------|----------|
| **6.7インチ** (iPhone 15 Pro Max等) | 1290 x 2796 | **必須** |
| **6.5インチ** (iPhone 14 Plus等) | 1284 x 2778 | **必須** |
| **5.5インチ** (iPhone 8 Plus等) | 1242 x 2208 | 任意（推奨） |
| **iPad Pro 12.9インチ** | 2048 x 2732 | iPadサポート時は必須 |

各サイズにつき **最低3枚、最大10枚** のスクリーンショットをアップロードできます。

### 7-2. スクリーンショットの撮影方法

**方法A: iOSシミュレーターで撮影（推奨）**

Macをお持ちの場合、Xcodeに付属のiOSシミュレーターを使うのが最も簡単です。

1. Xcodeを起動し、「Xcode」→「Open Developer Tool」→「Simulator」を選択
2. 適切なデバイス（iPhone 15 Pro Max等）を選択
3. LabStockアプリをシミュレーターで起動
4. `Command + S` でスクリーンショットを保存

**方法B: 実機で撮影**

1. iPhoneでLabStockアプリを起動
2. 撮影したい画面を表示
3. サイドボタン + 音量アップボタンを同時押しでスクリーンショット
4. MacまたはPCに転送

### 7-3. おすすめのスクリーンショット構成

以下の5枚を用意すると、アプリの魅力が効果的に伝わります。

| 枚数 | 画面 | アピールポイント |
|------|------|---------------|
| 1枚目 | 在庫一覧画面 | 「研究室の全備品を一目で管理」 |
| 2枚目 | 物品追加画面 | 「企業名・型番・画像を簡単登録」 |
| 3枚目 | バーコードスキャン画面 | 「バーコードで瞬時に登録」 |
| 4枚目 | アラート画面 | 「在庫不足を自動でお知らせ」 |
| 5枚目 | 設定画面（ダークモード） | 「ダークモード対応・Excel出力」 |

スクリーンショットにはテキストやデザイン要素を追加すると、より魅力的になります。[Canva](https://www.canva.com/) や [Figma](https://www.figma.com/) などの無料ツールで、フレーム付きのスクリーンショットを作成することをおすすめします。

---

## STEP 8: アプリを App Store Connect に提出する

ビルドが完了したら、生成されたIPAファイルをApp Store Connectにアップロードします。

### 8-1. EAS Submit を使う方法（推奨）

最も簡単な方法は、EAS CLIの `submit` コマンドを使うことです。

```bash
# App Store に提出
eas submit --platform ios
```

コマンドを実行すると、以下の質問が表示されます。

| 質問 | 回答 |
|------|------|
| Which build would you like to submit? | 最新のビルドを選択 |
| Would you like to log in to your Apple account? | **Yes** → Apple IDを入力 |

提出が完了すると、App Store Connectの「TestFlight」タブにビルドが表示されます。Appleによる自動処理（10〜15分程度）が完了すると、「iOS App」のバージョン情報でビルドを選択できるようになります。

### 8-2. Transporter を使う方法（手動）

Macをお持ちの場合、Apple公式の **Transporter** アプリを使ってIPAファイルを手動でアップロードすることもできます。

1. Mac App Store から「Transporter」をダウンロード・インストールします。
2. Transporter を起動し、Apple ID でサインインします。
3. ビルドで生成されたIPAファイルをTransporterのウィンドウにドラッグ＆ドロップします。
4. 「配信」ボタンをクリックします。
5. アップロード完了後、10〜15分でApp Store Connectに反映されます。

### 8-3. ビルドを選択する

App Store Connectにビルドが反映されたら、以下の手順でバージョン情報にビルドを紐付けます。

1. App Store Connect で対象アプリを開きます。
2. 左メニューの「iOS App」→ 対象バージョンをクリックします。
3. 「ビルド」セクションの **「+」ボタン** をクリックします。
4. アップロードしたビルドが表示されるので、選択して「完了」をクリックします。

---

## STEP 9: 審査を申請する

すべての情報を入力し、ビルドを選択したら、いよいよ審査の申請です。

### 9-1. 審査前の最終チェックリスト

審査を申請する前に、以下の項目がすべて完了していることを確認してください。

| チェック項目 | 状態 |
|------------|------|
| アプリ名とサブタイトルが入力されている | ☐ |
| 概要（説明文）が入力されている | ☐ |
| キーワードが設定されている | ☐ |
| スクリーンショットがアップロードされている（6.7インチ、6.5インチ） | ☐ |
| アプリアイコンが設定されている（ビルドに含まれるため自動） | ☐ |
| プライバシーポリシーURLが入力されている | ☐ |
| サポートURLが入力されている | ☐ |
| 年齢制限が設定されている | ☐ |
| 価格が設定されている（無料） | ☐ |
| Appのプライバシー情報が入力されている | ☐ |
| ビルドが選択されている | ☐ |

### 9-2. 審査を申請する

1. App Store Connect でアプリのバージョン情報ページを開きます。
2. 右上の **「審査に提出」** ボタンをクリックします。
3. 「輸出コンプライアンス」の質問に回答します。
   - 「このAppは暗号化を使用していますか？」→ **「いいえ」** を選択（標準的なHTTPS通信のみの場合）
4. 「広告識別子（IDFA）」の質問に回答します。
   - AdMobを使用しているため **「はい」** を選択
   - 用途として「サードパーティ広告の配信」にチェック
5. **「提出」** をクリックします。

### 9-3. 審査の所要時間

Appleの審査は通常 **24〜48時間** で完了します [10]。ただし、以下の場合はさらに時間がかかることがあります。

- 初回提出の場合（より詳細な審査が行われる）
- 年末年始やWWDC前後（審査が混雑する時期）
- 審査チームから追加情報を求められた場合

審査の進捗は、App Store Connect の「アクティビティ」タブで確認できます。

---

## STEP 10: 審査結果への対応

### 審査に通過した場合

審査に通過すると、ステータスが **「販売準備完了」** に変わり、App Storeにアプリが公開されます。STEP 6 で「手動リリース」を選択していた場合は、自分のタイミングで「リリース」ボタンをクリックして公開できます。

公開後は以下を確認しましょう。

- App Store でアプリ名を検索して表示されることを確認
- 実際にダウンロードして正常に動作することを確認
- AdMob広告が正しく表示されることを確認

### リジェクト（審査不合格）の場合

リジェクトされた場合は、App Store Connectに具体的な理由が表示されます。理由を確認し、修正して再提出してください。再提出後の審査は、初回よりも早く完了する傾向があります。

---

## よくあるリジェクト理由と対策

App Storeの審査でリジェクトされる理由の85%は、上位10項目に集中しています [11]。LabStockアプリに関連する可能性が高いものを以下にまとめます。

| リジェクト理由 | 対策 |
|-------------|------|
| **プライバシーポリシーの不備** | STEP 4 の内容を確実に記載し、有効なURLを設定する |
| **アプリの説明と実際の機能の不一致** | スクリーンショットと説明文がアプリの実際の機能と一致していることを確認 |
| **広告関連の設定不備** | ATT対応、プライバシーマニフェスト、IDFAの使用申告を正確に行う |
| **UIの不具合** | 全画面で正常に表示されること、ボタンが正しく動作することを確認 |
| **メタデータの不備** | スクリーンショット、説明文、カテゴリなどが正確に入力されていることを確認 |
| **最低限の機能要件** | アプリとして十分な機能があること（LabStockは問題なし） |

---

## 費用まとめ

LabStockアプリをApp Storeに公開するために必要な費用の一覧です。

| 項目 | 費用 | 頻度 | 備考 |
|------|------|------|------|
| **Apple Developer Program** | $99（約15,000円） | 年1回 | 必須。更新しないとアプリが非公開になる |
| **Expo / EAS** | 無料〜 | — | 無料プランで月30回のビルドが可能 |
| **Google AdMob** | 無料 | — | 広告収益は別途受け取り |
| **プライバシーポリシー公開** | 無料 | — | GitHub Pages等を利用 |
| **合計（初年度）** | **約15,000円** | — | 最低限必要な費用 |

---

## 参考リンク集

| リンク | 用途 |
|-------|------|
| [Apple Developer Program](https://developer.apple.com/programs/) | 開発者登録 |
| [App Store Connect](https://appstoreconnect.apple.com/) | アプリ管理・審査提出 |
| [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/) | 審査ガイドライン |
| [Expo EAS Build ドキュメント](https://docs.expo.dev/build/introduction/) | ビルド手順 |
| [Expo EAS Submit ドキュメント](https://docs.expo.dev/submit/ios/) | App Store提出手順 |
| [Google AdMob](https://admob.google.com/) | 広告管理 |
| [Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/) | Apple UIデザインガイドライン |

---

## References

[1]: https://developer.apple.com/programs/ "Apple Developer Program"
[2]: https://levtech.jp/partner/guide/article/detail/487/ "iOSアプリの公開にかかる費用"
[3]: https://qiita.com/tomada/items/57ed85f66cb3a233ebad "Apple Developer Program個人登録完全ガイド"
[4]: https://www.reddit.com/r/iOSProgramming/comments/1ot9lpn/ "Apple Developer Program processing time"
[5]: https://docs.expo.dev/submit/ios/ "Submit to the Apple App Store - Expo Documentation"
[6]: https://developer.apple.com/documentation/apptrackingtransparency "App Tracking Transparency - Apple Developer"
[7]: https://developer.apple.com/app-store/review/guidelines/ "App Store Review Guidelines"
[8]: https://developers.google.com/admob/ios/privacy/data-disclosure "App store data disclosure - AdMob iOS"
[9]: https://developer.apple.com/jp/help/app-store-connect/manage-app-information/upload-app-previews-and-screenshots/ "アプリプレビューとスクリーンショットのアップロード"
[10]: https://developer.apple.com/jp/app-store/submitting/ "アプリの提出 - App Store"
[11]: https://itans.jp/news/app-store-reject-reasons-2025 "アプリストアリジェクトのよくある理由 2025年版"
