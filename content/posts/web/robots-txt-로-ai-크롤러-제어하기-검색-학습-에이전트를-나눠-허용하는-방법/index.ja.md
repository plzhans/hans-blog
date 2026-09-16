---
id: "131"
translationKey: "131"
slug: "131-robots-txt-ai-crawler-content-signals"
title: "robots.txt で AI クローラーを制御する - 検索・学習・エージェントを分けて許可する方法"
description: "AI クローラーのせいで robots.txt に書くことが増えました。用途別のボット名と Google-Extended と Content-Signal を整理します。"
categories:
  - "web"
tags:
  - "ai"
  - "cloudflare"
  - "seo"
date: 2026-09-16T14:55:00.000Z
lastmod: 2026-09-16T14:55:00.000Z
toc: true
draft: false
images:
  - "assets/1_3dd22a0f-7e83-81b3-9ca5-fb1ae5e5862d.jpg"
---


![robots.txt を読み、検索とエージェントは通過し、学習クローラーは引き返す様子](./assets/1_3dd22a0f-7e83-81b3-9ca5-fb1ae5e5862d.jpg)


## 概要


robots.txt は 1994 年のメーリングリストでの合意として始まり、2022 年になってようやく [RFC 9309](https://www.rfc-editor.org/rfc/rfc9309.html) として標準になったファイルです。


ルールは単純です。サイトのルートにテキストファイルを一つ置き、<strong>誰が</strong>（`User-agent`）<strong>どこを</strong>（`Disallow` / `Allow`）クロールしてよいかを書きます。


かつては問題がありませんでした。クローラーの目的が実質的に一つだったからです。検索インデックスを作り、代わりにリンクで人を送り返す。やり取りが成立していました。


AI クローラーはその交換を壊しました。同じように取っていくのに送り返しません。モデルの学習に使い、ユーザーが質問したその瞬間にリアルタイムで読んでいきます。この三つはサイトから見れば<strong>まったく別のこと</strong>なのに、robots.txt にはそれを分けて書く欄がありませんでした。それで今、欄が増えつつあります。


### この記事で扱うこと

- 従来の robots.txt が扱っていたことと、その構造的な限界
- AI によって増えた項目 — 用途ごとに分かれたボット、クローラーではないトークン、`Content-Signal`
- なぜ今になって気にする必要があるのか・サイトの性格ごとに何を開き何を塞ぐか

---


## 従来 robots.txt に書いていたこと


文法は実質四行がすべてです。


```plain text
User-agent: *
Disallow: /admin/
Disallow: /*?sort=
Allow: /

Sitemap: https://example.com/sitemap.xml
```


使い道はたいていこの四つのどれかでした。

- <strong>見なくてよいパスを外す</strong> — `/admin/`、ログイン後のページ、ステージングの複製
- <strong>クロールバジェットを節約する</strong> — ソートやフィルタのクエリパラメータのように、実質同じページが数百に膨らむ URL
- <strong>ボットごとに違う指示を出す</strong> — `User-agent: Googlebot` のグループを別に書く形
- <strong>サイトマップの位置を知らせる</strong> — `Sitemap:` は、クローラーがどこから見るべきかを伝える唯一の標準的な通り道です

ここで二つ、最初に押さえておく必要があります。

1. <strong>強制力がありません。</strong>robots.txt はファイアウォールではなく<strong>お願い</strong>です。守るかどうかはボットの選択です。
守らないボットには何も起きません。本当に塞ぐならサーバーや WAF で塞ぐ必要があります。
2. <strong>Disallow はインデックス拒否ではありません。</strong>
むしろ逆に働く場合があります。クロールを塞ぐとクローラーがそのページの `noindex` メタタグを<strong>読めなくなり</strong>、外部リンクだけを見て URL だけを検索結果に残すことがあります。
インデックスから外したいなら、クロールは開けておいて `noindex` を読ませる必要があります。

そしてこの記事の核心である三つ目の限界。<strong>軸が二つしかありません。</strong>誰が、どこを。<strong>何に使うのか</strong>を書く場所がありません。


---


## AI が生まれて増えた項目


### ① 一社がボットを複数走らせる


用途の欄がないので、各社が選んだ回り道は<strong>用途ごとにボット名を別に用意すること</strong>でした。現在の主要各社は、おおむね学習 / 検索 / ユーザーのリアルタイム要求の三つに分けています。

- <strong>OpenAI</strong> — `GPTBot`（学習）、`OAI-SearchBot`（検索インデックス）、`ChatGPT-User`（ユーザーがリンクについて尋ねた瞬間のリアルタイム訪問）
- <strong>Anthropic</strong> — `ClaudeBot`（学習）、`Claude-SearchBot`（検索）、`Claude-User`（ユーザー要求）
- <strong>Perplexity</strong> — `PerplexityBot`、`Perplexity-User`
- <strong>Meta</strong> — `Meta-ExternalAgent`
- <strong>Common Crawl</strong> — `CCBot`。これは特定のモデルの所有ではなく<strong>公開データセット</strong>です。そのデータセットを複数のモデルが学習に使います

おかげでこうした分岐が可能になりました。


```plain text
# 検索は歓迎、学習はお断り
User-agent: OAI-SearchBot
Allow: /

User-agent: GPTBot
Disallow: /
```


ただし構造的な限界はそのままです。<strong>これはブラックリストです。</strong>ボット名を自分ですべて把握していなければなりません。各社が新しいボットを一つ作れば、自分の robots.txt はその日から遅れます。名前を管理する仕事が終わりません。


### ② クローラーではない「トークン」が登場した


`Google-Extended` と `Applebot-Extended` は<strong>ボット名ではありません。</strong>その名前で訪れるクローラーは存在しません。


Google を例に見ましょう。Google のクローラーは `Googlebot` 一つです。このボットが来てページを取っていきます。ところが取っていったデータは検索インデックスにも使われ、Gemini の学習にも使われます。


ここで問題が生じます。学習が嫌だからと `Googlebot` を塞ぐと、<strong>検索からも一緒に消えます。</strong>二つを分ける方法がありませんでした。


そこで Google が別に作ったのが `Google-Extended` です。クロールはそのままにして、<strong>「取っていったものを学習には使うな」だけを別に言うスイッチ</strong>です。


```plain text
User-agent: Google-Extended
Disallow: /
```


こう書いても `Googlebot` はいつも通り来ます。検索順位もそのままです。学習の側だけが外れます。


意味は小さくありません。robots.txt が<strong>アクセスではなく用途を制御した最初の事例</strong>です。ファイルの性格が「クロールするな」から「クロールは構わないが、その用途には使うな」へ移ったのです。


### ③ 用途を直接書く `Content-Signal`


ボット名を追いかける代わりに、いっそ<strong>用途の軸を文法にしてしまおう</strong>というのが、Cloudflare が 2025 年 9 月に出した [Content Signals Policy](https://contentsignals.org/) です。


```plain text
User-agent: *
Allow: /

Content-Signal: search=yes, ai-input=yes, ai-train=no
```


値は三つです。

- `search` — 検索インデックスを作り、リンクで人を送り返す用途
- `ai-input` — 回答を生成する時点でコンテンツを入力として入れる用途（RAG・グラウンディング）
- `ai-train` — モデルを学習・ファインチューニングする用途

それぞれ `yes` / `no` です。<strong>書かなければ「意思表示なし」</strong>です。許可でも禁止でもありません。


よい点は、ボット名を知らなくてよいことです。`User-agent: *` 一つに用途三行を書けば、新しく生まれたボットにもそのまま適用されます。逆にはっきりさせておくべき点は、<strong>これも依然として強制ではないということ</strong>です。Content Signals は技術的な遮断ではなく<strong>意思表示</strong>です。robots.txt の中に人が読めるライセンス文言を一緒に入れ、「知らなかった」という言い訳を封じることが目的です。執行ではなく根拠です。


実際にどう使うかは、このブログの設定ですぐ後に見ていきます。


### ④ 標準化も進んでいる


IETF に [AI Preferences（aipref）ワーキンググループ](https://datatracker.ietf.org/wg/aipref/about/)ができ、用途の語彙とそれを付ける方法を標準として整えています。まだ草案段階ですが、方向は `Content-Signal` と同じです。<strong>用途ごとの語彙を定め</strong>、robots.txt だけでなく<strong>HTTP レスポンスヘッダーでも</strong>付けられるようにすること。ヘッダーで付けられれば、ページ単位を超えて画像や PDF のような個別ファイルにも意思を示せます。


### ⑤ 混同しやすいもの — `llms.txt` は権限ファイルではない


一緒に言及されるものの、性格が違うファイルがあります。

- <strong>`llms.txt`</strong> — 許可・遮断とは<strong>まったく関係ありません。</strong>LLM がサイトを理解しやすいように、主要ドキュメントの一覧をマークダウンで整理した<strong>案内文</strong>に近いものです。robots.txt の代替ではありません
- <strong>`ai.txt`</strong> — 学習データのオプトアウトを狙った別ファイル。採用率が低く、実質的に `Content-Signal` の側へ収束しつつある雰囲気です

### ⑥ そして robots.txt では塞げないもの — AI エージェント


ここが今いちばん曖昧な点です。


ブラウザを直接操作する AI エージェントは<strong>クローラーではありません。</strong>人が「このページを要約して」と指示して、人の代わりに一度入ってくる<strong>代理人</strong>です。robots.txt はそもそも自動クローラーのための規約なので、ユーザーが直接指示した単発のアクセスには原則として適用対象ではない、という解釈が優勢です。実際に `ChatGPT-User` や `Claude-User` といった名前が別にある理由がそれです。


さらに User-Agent 文字列はただの<strong>自己申告</strong>です。その気になれば普通のブラウザのふりができます。そのため Cloudflare は [mixed-use クローラーに責任を](https://blog.cloudflare.com/accountable-mixed-use-ai-crawlers/)という記事で二つを求めています。一つのクローラーが検索と学習を兼ねるとサイト側には分岐する方法がないので、<strong>目的別にボットを分け</strong>、UA 文字列の代わりに<strong>暗号学的な署名で身元を証明せよ</strong>ということ（Web Bot Auth）です。名前を信じる体制から、署名を検証する体制へ移ろうという話です。


---


## それでなぜ気にする必要があるのか


従来の検索クローラーは実のところ大した問題ではありませんでした。Googlebot は定期的に立ち寄り、変わったものだけを取っていきます。代わりに検索結果で人を送ってくれます。負荷も大きくなく、返ってくるものもあるので、あえて塞ぐ理由がありませんでした。


AI クローラーは違います。学習用の収集はサイトを丸ごとさらうことが目的です。変わったものだけを見るのではなく、あるだけ取っていきます。一度訪れる規模が検索クローラーとは比較になりません。このブログだけ見ても、AI クローラー一社がリクエスト数で Googlebot の七倍を取っていきました。


それはタダではありません。

- 静的ブログなら帯域くらいです。<strong>動的サイトや API を抱えていればそのままサーバー負荷</strong>になります
- 検索と違って<strong>返ってくるものがありません。</strong>AI の回答に引用されても、リンクをたどって来る人は少ないです
- 学習に一度入った文章は<strong>取り消せません</strong>

とはいえ全部塞ぐことが答えではありません。<strong>サイトの性格によって答えが違います。</strong>

- <strong>個人ブログ・技術文書</strong> — 読まれることが目的です。検索はもちろん、AI の回答に引用される経路（`ai-input`）まで塞ぐと損のほうが大きいです
- <strong>ニュース・有料コンテンツ・創作物</strong> — コンテンツ自体が商品です。`ai-train` は閉じるのが基本です
- <strong>コマース・社内サービス</strong> — 学習価値は低く、負荷だけが残る場合が多いです。大量収集型から選んで塞ぐほうがよいです

結局 robots.txt は今や<strong>「開くか塞ぐか」ではなく「何のために開くか」を決めるファイル</strong>になりました。


### このブログはこうしてある


個人の技術ブログなので三つとも開けてあります。読まれるために書く文章なので、学習まで塞ぐ理由はないと考えました。


```plain text
User-agent: *
Allow: /

Content-Signal: search=yes, ai-input=yes, ai-train=yes

Sitemap: https://blog.plzhans.com/sitemap.xml
```

- `Allow: /` — パス制限はかけていません。隠すもののないサイトです
- `Content-Signal` — 検索・AI 回答・学習の三つとも `yes`
- `Sitemap:` — <strong>意外にもこれが負荷を減らします。</strong>クローラーがサイトをやみくもにさらう代わりに、一覧を見て必要なものだけ取っていくようになります。塞ぐことだけが方法ではありません

Hugo なら `hugo.toml` に `enableRobotsTXT = true` を入れ、`layouts/robots.txt` に上の内容を置けばビルド時に生成されます。`sitemap.xml` は Hugo が自動で作ります。


---


## まとめ

- robots.txt はもともと、誰がどこをクロールしてよいかだけを書くファイルでした。今は、取っていったものをどこに使うかまで書く必要があります。
- ボット名を分けて塞ぐ方式はブラックリストなので終わりがありません。Content-Signal は search・ai-input・ai-train の三つに減らしました。
- 個人ブログなら search と ai-input は開けておくほうがよいです。悩むべきは ai-train 一つです。
- robots.txt は最後までお願いです。強制するにはサーバーで直接断ち切る必要があります。

Cloudflare を使っているなら、その仕事を機能として提供しています。

- [CloudflareでAIボットをブロックする - Managed robots.txt と AI Crawl Control](../132-cloudflare-ai-crawl-control-managed-robots-txt/) — Managed robots.txt · Block AI bots · AI Crawl Control

### 参考

- [RFC 9309 — Robots Exclusion Protocol](https://www.rfc-editor.org/rfc/rfc9309.html)
- [Content Signals Policy](https://contentsignals.org/)
- [Cloudflare ブログ — mixed-use AI クローラーに責任を](https://blog.cloudflare.com/accountable-mixed-use-ai-crawlers/)
- [IETF AI Preferences (aipref) WG](https://datatracker.ietf.org/wg/aipref/about/)
