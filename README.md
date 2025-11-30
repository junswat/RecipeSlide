# Recipe Slide PWA

料理中に便利なレシピスライドビューワー

## 機能

- **レシピ登録**: MarkdownでYouTubeレシピを保存
- **スライド表示**: 見出しごとに自動分割
- **カテゴリ管理**: 和食・洋食・中華・その他
- **検索・フィルタ**: お気に入り、カテゴリ別
- **表示設定**: 文字サイズ調整、画面常時点灯
- **タイマー**: プリセット付き調理タイマー
- **買い物リスト**: 材料を自動抽出
- **編集・削除**: レシピの管理
- **PWA対応**: オフライン動作、ホーム画面追加

## 使い方

1. 右上の「+」ボタンでレシピを追加
2. Perplexityなどで生成したMarkdownを貼り付け
3. カードをクリックしてスライド表示
4. スワイプで次のスライドへ

## デプロイ

GitHub Pagesで公開中: [https://junswat.github.io/RecipeSlide/](https://junswat.github.io/RecipeSlide/)

## 技術スタック

- HTML5、CSS3、Vanilla JavaScript
- Swiper.js（スライダー）
- Marked.js（Markdown解析）
- Dexie.js（IndexedDB）
- Service Worker（PWA）
