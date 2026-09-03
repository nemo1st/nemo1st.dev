---
title: "nemo1st.devをMarkdownで運用する"
date: 2026-09-03
description: "MarkdownをGitHubへpushし、静的な記事ページを自動生成して公開するまでの仕組みをまとめます。"
tags: [GitHub Actions, Markdown, SSG]
draft: false
---

## はじめに

このサイトの記事は `content/blog` ディレクトリにあるMarkdownファイルを原稿として管理します。管理画面やデータベースを使わず、Gitの履歴がそのまま記事の変更履歴になります。

## 公開までの流れ

記事を公開するときの手順は次のとおりです。

1. Markdownファイルを作成する
2. Front Matterにタイトルや日付を記入する
3. GitHubへpushする
4. GitHub ActionsがHTMLを生成する
5. GitHub Pagesへ生成結果を公開する

ビルドは次のコマンドでも手元で確認できます。

```shell
npm run build
npm run dev
```

## Front Matter

記事の先頭には、一覧やOGメタデータに使う情報を書きます。

```yaml
---
title: "記事タイトル"
date: 2026-09-03
description: "一覧に表示する概要です。"
tags: [Rails, Ruby]
draft: false
---
```

`draft: true` にすると、ファイルをGitHubへ置いたまま公開対象から外せます。

## まとめ

原稿はMarkdown、公開物は静的HTMLという役割分担にしました。サーバー側のデータベースが不要なので、構成を小さく保ちながらGitHubだけで執筆と公開を完結できます。
