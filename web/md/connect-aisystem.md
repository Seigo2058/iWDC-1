# 料理解析AI連携 要件定義書

**対象プロダクト:** Point & Know（料理解析API）
**改訂:** `ai/app/routers/food.py`（PR #3）の実装と web 側の接続（`dev/web-ai-integration`）を反映。旧版で「未確定」としていた未検出時のレスポンス・CORSは実装から確定した。

## 1. 背景・目的

撮影 → トリミング → 確認（`capture-tasks.md` で定義済みのフロー）で確定した写真を料理解析AIに送信し、写っている料理を識別させ、名称・説明・材料・栄養情報などを英語・タイ語・日本語で取得してアプリ内に表示する。

料理解析APIは本リポジトリの `ai/`（FastAPI）に実装されている。

| 項目 | 場所 |
| --- | --- |
| エンドポイント実装 | `ai/app/routers/food.py`（`POST /api/analyze-food`） |
| 料理の識別 | Google Gemini（`GEMINI_API_KEY`） |
| 料理データ | Supabase の Postgres、テーブル `food_items`（`ai/app/db/models.py`） |
| 突き合わせ方法 | Gemini が返した英語名で `food_items.name_en` を大文字小文字無視の完全一致で検索する |

## 2. アプリ内の位置づけ

| 項目 | 内容 |
| --- | --- |
| 呼び出しタイミング | `ConfirmStep`（確認画面）で「確定（Decide Photo）」を押したとき |
| 呼び出し元 | `web/lib/capture/submitPhoto.ts` |
| 送信するデータ | `ConfirmStep` で圧縮済みの最終画像（`finalImage`、常にJPEG） |
| 成功時の結果表示 | `web/components/capture/ResultStep.tsx`。1品なら料理データカード（`FoodDetail`）を直接表示し、複数品なら料理一覧（`FoodList`）→タップで料理データカード（3.3.1） |
| 未検出時の結果表示 | 未検出画面（`web/components/capture/NotFoundStep.tsx`、4章） |

### 2.1 接続構成

ブラウザは backend を直接呼ばず、同じオリジンの `/api/analyze-food` を呼ぶ。Next.js が `next.config.ts` の `rewrites` でそのリクエストを backend に中継する。

```
ブラウザ ──POST /api/analyze-food──▶ Next.js (web, :3000)
                                        │ rewrites（AI_API_ORIGIN へ転送）
                                        ▼
                               FastAPI (ai, :8000) ──▶ Gemini / Supabase
```

この構成にしている理由:
- スマートフォン実機から cloudflared トンネル経由で確認するとき、トンネルは web の1本だけでよい（ブラウザから見た `localhost:8000` はスマホ自身を指すため直接は届かない）。
- HTTPS のページから HTTP の backend を呼ぶ Mixed Content が起きない。
- 同一オリジンになるので CORS の影響を受けない。

## 3. 連携API仕様

### 3.1 エンドポイント

| 項目 | 内容 |
| --- | --- |
| メソッド | POST |
| ブラウザから呼ぶURL | `/api/analyze-food`（同一オリジン、固定） |
| 転送先 | `${AI_API_ORIGIN}/api/analyze-food`。`AI_API_ORIGIN` は `web/.env.local` に設定するサーバー側専用の環境変数（例: `http://localhost:8000`）。ブラウザには公開しない |
| 説明 | トリミングした写真を送信し、AIに料理を識別させ、データベースから詳細情報を取得する。1枚の写真に複数の料理が写っている場合（メニュー表や、複数の皿が並んだ食卓）は、識別できたすべての料理を返す。**送信するのは画像のみで、テキストの送信には対応しない** |

### 3.2 リクエスト

- `Content-Type: multipart/form-data` — ブラウザに自動設定させる。fetchで手動設定しない。
- Body: `FormData`

| フィールド | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `file` | File | ○ | トリミング済みの画像ファイル。`Content-Type` が `image/` で始まる必要がある。本アプリからは常に `photo.jpg`（`image/jpeg`）を送信する |

```js
const formData = new FormData();
formData.append("file", new File([image], "photo.jpg", { type: "image/jpeg" }));
const response = await fetch("/api/analyze-food", {
  method: "POST",
  body: formData,
  // "Content-Type" ヘッダーは手動で追加しない
});
```

**アップロード可能な画像の制約:** `web/components/capture/ConfirmStep.tsx` の圧縮設定（`browser-image-compression`、`maxWidthOrHeight: 2000` / `maxSizeMB: 2`）を継続する。設定を変更する場合は backend 側の要件を再確認すること。

### 3.3 レスポンス（識別成功時、ステータス200）

`data` は**料理オブジェクトの配列**で、DBに存在した料理だけが入る（1品の写真なら要素1つ）。Gemini が識別したがDBに無い料理は配列に含まれず、レスポンスにも名前は返らない。配列の順序はDBの検索結果順で、Gemini が識別した順とは限らない。

```json
{
  "status": "success",
  "message": "Found 2 food item(s).",
  "data": [
    {
      "food_id": 2,
      "name_en": "Tom Yum Goong",
      "name_th": "ต้มยำกุ้ง",
      "name_jp": "トムヤムクン",
      "description": { "en": "...", "th": "...", "jp": "..." },
      "ingredients": {
        "en": ["shrimp", "lemongrass", "..."],
        "th": ["กุ้ง", "ตะไคร้", "..."],
        "jp": ["エビ", "レモングラス", "..."]
      },
      "spicy_level": "Very Spicy",
      "calories": 220,
      "protein": 24,
      "carbs": 12,
      "fat": 8,
      "how_to_eat": { "en": "...", "th": "...", "jp": "..." },
      "source_url": "https://en.wikipedia.org/wiki/Tom_yum",
      "image_url": ""
    },
    { "food_id": 5, "name_en": "Pad Krapow", "...": "..." }
  ]
}
```

| フィールド | 例 | 用途 |
| --- | --- | --- |
| `status` | success | 識別とDB照合の両方に成功し、`data` に1品以上あることを示す |
| `message` | Found 2 food item(s). | レスポンスのステータスメッセージ |
| `data[]` | 料理オブジェクトの配列 | 以下 `data.*` は各要素のフィールド |
| `data.food_id` | 2 | `food_items` 上の一意の料理ID |
| `data.name_en` / `name_th` / `name_jp` | Tom Yum Goong / ต้มยำกุ้ง / トムヤムクン | 英語・タイ語・日本語の料理名 |
| `data.description` | `{en, th, jp}` | 3言語での料理の説明 |
| `data.ingredients` | `{en, th, jp}`（各言語の文字列配列） | 主な材料。旧仕様の英語のみの配列が返ってきても表示できるよう、フロントは両方の形に対応している |
| `data.spicy_level` | Very Spicy | 辛さレベル。**`No Spicy` / `Low Spicy` / `Medium Spicy` / `Very Spicy` の4種類**。表示用の3言語ラベルはフロント側で用意する |
| `data.calories` | 220 | カロリー（kcal、一食分の目安）。DBカラム `calories_kcal` を API が変換して返す |
| `data.protein` | 24 | タンパク質量（g、一食分の目安）。DBカラム `protein_g` |
| `data.carbs` | 12 | 炭水化物量（g、一食分の目安）。DBカラム `carbohydrate_g` |
| `data.fat` | 8 | 脂質量（g、一食分の目安）。DBカラム `fat_g` |
| `data.how_to_eat` | `{en, th, jp}` | 3言語での料理の食べ方 |
| `data.source_url` | https://... | 料理情報の出典URL（英語のソースのみ） |
| `data.image_url` | （空文字の場合あり） | 料理の参考画像URL。料理データカードの「参考写真」と、料理一覧のサムネイルに使う |

> 旧仕様の `detected_name`（識別した英語名1つ）と、`data` が単一オブジェクトだった形は廃止された。フロントは配列の形のみに対応している。

#### 3.3.1 複数品の表示（フロント）

| `data` の件数 | 表示 |
| --- | --- |
| 1品 | これまでどおり料理データカードを直接表示する（ユーザーが撮った写真も表示） |
| 2品以上 | 「N品の料理が見つかりました」の一覧を表示する。各行は参考写真のサムネイル・料理名・説明（2行まで）・辛さ。タップするとその料理の料理データカードを表示し、「一覧に戻る」で一覧に戻る（一覧のスクロール位置は保持）。ユーザーの写真は複数の料理を写したものなので、一覧にだけ表示し、個別の料理データカードには表示しない |

### 3.4 レスポンス（識別できたがDBに該当が無い場合、ステータス200）

`ai/app/routers/food.py` の実装では、**HTTP 200 のまま `status` を `"partial_success"` にし、`data` を空配列で返す**。識別した英語名は `detected_names` に入る。

```json
{
  "status": "partial_success",
  "message": "Food recognized, but details are not in our database yet.",
  "detected_names": ["Pad Krapow"],
  "data": []
}
```

> 旧版の要件（旧4章の回答）では「専用のステータスコードを用意する」としていたが、実装は上記の形になっている。**フロントは実装に合わせている**。今後 backend を専用ステータスコードに変更する場合は、`submitPhoto.ts` の判定も合わせて変更すること。

### 3.4.1 レスポンス（料理を1品も識別できなかった場合、ステータス200）

Gemini が空配列を返した場合は `data` を含まずに返す。フロントは 3.4 と同じく未検出画面に遷移する。

```json
{
  "status": "fail",
  "message": "No recognizable food detected."
}
```

### 3.5 エラー

| ステータス | 発生元 | 意味 | フロントの扱い |
| --- | --- | --- | --- |
| 400 | backend | アップロードされたファイルが画像ではない | 解析失敗メッセージ |
| 422 | backend | body に `file` が含まれていない | 解析失敗メッセージ |
| 500 | backend | Gemini の処理失敗、またはDBエラー | 解析失敗メッセージ |
| 500 | Next.js | backend が起動していない／到達できない（中継に失敗） | 解析失敗メッセージ |
| 404 | Next.js / backend | `AI_API_ORIGIN` が未設定、または転送先に `/api/analyze-food` が無い | 設定エラーメッセージ |

## 4. 未検出時の画面

未検出時は `NotFoundStep` を表示し、以下のアクションを提示する（実装済み）。

| 要件上の表現 | 本アプリでの実装 |
| --- | --- |
| ギャラリーに戻る | ホーム画面（`/[lang]`）に戻る |
| 写真を撮る | 撮影ステップ（`CaptureStep`）からやり直す |
| 画像を再編集 | トリミングステップ（`CropStep`）に戻る（`rawImage` は保持） |

本アプリには「ギャラリー」に相当する画面が無いため、ホーム画面に読み替えている。

## 5. 残っている未確定事項

1. **本番/検証環境の backend のオリジン** — `AI_API_ORIGIN` に設定する値。ローカル開発は `http://localhost:8000`。
2. **AI解析の処理時間・タイムアウトの目安** — フロント側は暫定で30秒のタイムアウトを設定している。
3. **未検出時の返し方を仕様どおり専用ステータスコードにするか** — 現状の実装（3.4）のままでよいか、backend と合意しておく。

## 6. フロントエンド実装方針

- ブラウザは同一オリジンの `/api/analyze-food` を呼び、`next.config.ts` の `rewrites` で `AI_API_ORIGIN` に中継する。backend のURLはブラウザに公開しない。
- `AI_API_ORIGIN` が未設定のとき、Next.js は起動時に警告を出し、中継を登録しない（リクエストは404になる）。
- 送信ファイルは常にJPEG（`ConfirmStep` の圧縮結果）。圧縮設定は変更しない。
- `lang`（`"en"` | `"ja"` | `"th"`）→ APIの言語サフィックス（`"en"` | `"jp"` | `"th"`）への変換マップを用意する（本アプリの `ja` を、このAPIとやり取りする箇所に限り `jp` に読み替える。アプリ全体の言語コードやURL構造 `/ja` は変更しない）。
- `spicy_level` の4値は値にスペースを含むため、i18nキーはスラッグ（`none` / `low` / `medium` / `very`）に変換して参照する。
- レスポンスの分岐:
  - 200 かつ `status: "success"`（`data` が配列で、正しい形の料理が1品以上）→ 1品なら料理データカード、複数品なら料理一覧（3.3.1）。形の崩れた要素は捨て、残りだけ表示する
  - 200 かつそれ以外（`partial_success` / `fail` など）→ 未検出画面
  - 404 → 設定エラー（確認画面に留まる）
  - その他の非200 → 解析失敗（確認画面に留まり、確定ボタンで再試行できる）
  - 通信失敗・タイムアウト → それぞれのエラーメッセージ（確認画面に留まる）
- AI処理中は「料理を解析しています...」を表示する。

## 7. ローカルでの起動手順

### 7.1 backend（`ai/`）

1. `ai/.env`（`.gitignore` 対象）に以下を記入する。
   - `DATABASE_URL` — Supabase ダッシュボード右上「Connect」→「Session pooler」の URI。先頭の `postgresql://` を `postgresql+asyncpg://` に書き換える（Transaction pooler のポート6543は asyncpg と相性が悪いので使わない）。
   - `GEMINI_API_KEY` — Google AI Studio で発行したAPIキー。
2. 起動（`.env` を読み込むため、必ず `ai/` ディレクトリで実行する）。

```bash
cd ai
python3 -m venv .venv          # 初回のみ
.venv/bin/pip install -r requirements.txt   # 初回・依存追加時
.venv/bin/uvicorn app.main:app --reload --port 8000
```

`http://localhost:8000/docs` で API ドキュメントが開ければ起動成功。

### 7.2 web（`web/`）

1. `web/.env.local` に `AI_API_ORIGIN=http://localhost:8000` を設定する（`next.config.ts` が起動時に読むので、変更したら dev サーバーを再起動する）。
2. `npm run dev` で起動する。スマホ実機で確認する場合は web の dev サーバーだけを cloudflared で公開すればよい。

## 8. フロントエンド連携チェックリスト

- ブラウザからは同一オリジンの `/api/analyze-food` に POST する
- `FormData` にフィールド名 `"file"` でトリミング済み画像を append する
- `"Content-Type"` ヘッダーを手動で設定しない
- `status: "success"` のときだけ `data`（配列）を表示する。1品なら料理データカード、複数品なら料理一覧
- `status: "partial_success"`（`data: []`）と `status: "fail"` は未検出画面に遷移する
- `spicy_level` の4値を3言語ラベルに変換して表示する
- 栄養情報（calories/protein/carbs/fat）は「一食分の目安」として表示する
- 404 は設定エラー、その他の非200・通信失敗・タイムアウトは確認画面でエラー表示し再試行できるようにする
- backend のURLは `AI_API_ORIGIN`（サーバー側）で設定し、コードやブラウザ向けの環境変数に書かない
