# App Store リリース調査メモ

## Apple Developer Program
- 年間費用: $99（約12,800円、Apple Developer App経由）
- 個人または法人で登録可能
- 本人確認にはパスポートが最も成功率が高い
- 登録完了まで数日〜1週間程度

## EAS Build / Submit の流れ
1. EAS CLIインストール: npm install -g eas-cli && eas login
2. eas.json設定
3. ビルド: eas build --platform ios --profile production
4. 提出: eas submit --platform ios
5. App Store Connectでメタデータ入力

## App Store Connect で必要なもの
- アプリ名（他アプリと重複不可）
- バンドルID
- SKU（内部識別子）
- スクリーンショット（6.7インチ、6.5インチ、5.5インチ等）
- アプリアイコン（1024x1024）
- プライバシーポリシーURL
- アプリの説明文
- カテゴリ選択
- 年齢制限設定
- 広告IDの使用有無（AdMob使用のため「はい」）

## よくあるリジェクト理由
- プライバシーポリシー未記載
- UIがApple HIG非準拠
- 広告関連のプライバシー設定不備
- スクリーンショットの不備
- アプリの説明と実際の機能の不一致

## AdMob関連の注意点
- プライバシーポリシーにAdMobのデータ収集を明記
- App Tracking Transparency対応
- SKAdNetwork設定
- Google Mobile Ads SDKのプライバシーマニフェスト対応

## Manus Publishボタン
- チェックポイント作成後にPublishボタンが有効化
- ビルド（APK/IPA）が生成される
- 生成されたIPAをApp Store Connectに提出
