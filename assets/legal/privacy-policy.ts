/**
 * LabStock プライバシーポリシー
 * アプリ内表示用のテキストデータ
 */

export const PRIVACY_POLICY_JA = `
# プライバシーポリシー

最終更新日: 2026年3月8日

本プライバシーポリシー（以下「本ポリシー」）は、LabStock（以下「本アプリ」）における個人情報およびユーザー情報の取り扱いについて定めるものです。本アプリをご利用いただく前に、本ポリシーをよくお読みください。

## 1. 運営者情報

本アプリは、個人開発者（以下「運営者」）が提供するモバイルアプリケーションです。お問い合わせは、アプリ内の設定画面に記載のメールアドレスまでご連絡ください。

## 2. 収集する情報

### 2.1 ユーザーが直接提供する情報

本アプリでは、以下の情報をユーザーの端末内（ローカルストレージ）にのみ保存します。

- **ユーザー名**: アプリ内での表示名として使用
- **在庫データ**: 物品名、企業名、型番、個数、カテゴリ、画像、バーコード情報
- **変更ログ**: 在庫数の変更履歴（変更者名、日時、変更内容）
- **アラート設定**: 在庫不足の閾値設定

### 2.2 自動的に収集される情報

本アプリでは、広告配信のために以下の情報が第三者（広告ネットワーク）により自動的に収集される場合があります。

- **広告識別子（IDFA）**: iOS端末の広告用識別子。App Tracking Transparency（ATT）の許可を得た場合のみ収集されます。
- **デバイス情報**: 端末の種類、OSバージョン、言語設定等
- **利用状況データ**: 広告の表示回数、クリック数等

### 2.3 カメラ・写真ライブラリへのアクセス

本アプリでは、以下の目的でカメラおよび写真ライブラリへのアクセスを要求する場合があります。

- 物品の画像撮影・添付
- バーコード/QRコードの読み取り

これらの機能は、ユーザーが明示的に許可した場合にのみ利用されます。撮影・選択された画像は端末内にのみ保存され、外部サーバーには送信されません。

## 3. 情報の利用目的

収集した情報は、以下の目的でのみ利用します。

| 情報の種類 | 利用目的 |
|---|---|
| ユーザー名 | アプリ内での変更ログの記録・表示 |
| 在庫データ | 在庫管理機能の提供 |
| 変更ログ | 在庫変更履歴の記録・表示 |
| アラート設定 | 在庫不足通知の送信 |
| 広告識別子 | パーソナライズド広告の配信（許可時のみ） |

## 4. 情報の保存場所とセキュリティ

### 4.1 ローカルストレージ

本アプリのすべてのユーザーデータは、ユーザーの端末内（ローカルストレージ）にのみ保存されます。運営者のサーバーにデータが送信されることはありません。

### 4.2 セキュリティ対策

本アプリでは、以下のセキュリティ対策を講じています。

- 機密性の高い設定情報は、端末の暗号化ストレージ（iOS Keychain / Android Keystore）に保存
- 入力データのバリデーションとサニタイズ処理
- 不正なデータ入力の防止

## 5. 第三者への情報提供

### 5.1 広告ネットワーク

本アプリでは、Google AdMobを利用した広告配信を行っています。AdMobは、広告配信の最適化のために端末情報や広告識別子を収集する場合があります。

- Google AdMob プライバシーポリシー: https://policies.google.com/privacy

### 5.2 その他の第三者提供

上記の広告ネットワークを除き、ユーザーの個人情報を第三者に提供することはありません。ただし、以下の場合を除きます。

- ユーザーの同意がある場合
- 法令に基づく開示請求があった場合
- 人の生命、身体または財産の保護のために必要がある場合

## 6. ユーザーの権利

### 6.1 データの確認・修正

ユーザーは、アプリ内の各画面から、保存されている在庫データや設定情報をいつでも確認・修正できます。

### 6.2 データの削除

ユーザーは、設定画面の「全データ削除」機能を使用して、アプリ内に保存されているすべてのデータを完全に削除できます。また、アプリをアンインストールすることで、端末内のすべてのデータが削除されます。

### 6.3 広告トラッキングの拒否

iOS 14.5以降の端末では、App Tracking Transparency（ATT）の設定により、広告トラッキングを拒否できます。拒否した場合でも、アプリの基本機能は制限なくご利用いただけます。

## 7. 児童のプライバシー

本アプリは、13歳未満の児童を対象としたサービスではありません。13歳未満の児童から意図的に個人情報を収集することはありません。

## 8. 本ポリシーの変更

運営者は、必要に応じて本ポリシーを変更することがあります。重要な変更がある場合は、アプリ内の通知またはアプリのアップデート情報にてお知らせします。変更後のポリシーは、アプリ内に掲載された時点から効力を生じるものとします。

## 9. 準拠法

本ポリシーは、日本法に準拠し、解釈されるものとします。

## 10. お問い合わせ

本ポリシーに関するお問い合わせは、アプリ内の設定画面に記載の連絡先までお願いいたします。
`;

export const PRIVACY_POLICY_EN = `
# Privacy Policy

Last updated: March 8, 2026

This Privacy Policy ("Policy") describes how LabStock ("the App") handles personal information and user data. Please read this Policy carefully before using the App.

## 1. Data We Collect

### 1.1 Information You Provide

All user data is stored locally on your device only:

- **Username**: Display name within the app
- **Inventory data**: Item names, company names, model numbers, quantities, categories, images, barcode information
- **Change logs**: Inventory change history (who changed, when, what)
- **Alert settings**: Low-stock threshold configurations

### 1.2 Automatically Collected Information

For advertising purposes, the following information may be collected by third-party advertising networks:

- **Advertising Identifier (IDFA)**: Only collected with your explicit permission via App Tracking Transparency (ATT)
- **Device information**: Device type, OS version, language settings
- **Usage data**: Ad impressions and click data

### 1.3 Camera and Photo Library Access

The App may request access to your camera and photo library for:

- Taking and attaching item photos
- Scanning barcodes/QR codes

These features are only used with your explicit permission. Images are stored locally and are never transmitted to external servers.

## 2. How We Use Your Information

| Information | Purpose |
|---|---|
| Username | Recording and displaying change logs |
| Inventory data | Providing inventory management features |
| Change logs | Recording and displaying change history |
| Alert settings | Sending low-stock notifications |
| Advertising ID | Personalized ad delivery (with permission only) |

## 3. Data Storage and Security

All user data is stored exclusively on your device's local storage. No data is transmitted to our servers. Sensitive settings are stored using the device's encrypted storage (iOS Keychain / Android Keystore).

## 4. Third-Party Services

The App uses Google AdMob for advertising. AdMob may collect device information and advertising identifiers for ad optimization. See Google's Privacy Policy: https://policies.google.com/privacy

## 5. Your Rights

- **Access and modify**: View and edit your data anytime within the app
- **Delete**: Use "Delete All Data" in Settings to permanently remove all app data
- **Opt-out of tracking**: Deny ad tracking via ATT settings without affecting app functionality

## 6. Children's Privacy

The App is not intended for children under 13. We do not knowingly collect personal information from children under 13.

## 7. Changes to This Policy

We may update this Policy as needed. Significant changes will be communicated through app notifications or update notes.

## 8. Contact

For questions about this Policy, please contact us through the Settings screen in the app.
`;
