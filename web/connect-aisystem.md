# 🚀 Point & Know – 料理解析API仕様書

**フロントエンド連携ドキュメント**

料理解析用のバックエンドエンドポイントが稼働を開始しました(CORSは解放済み)。以下の仕様に従ってフロントエンドの連携を開始できます。

## 1. エンドポイントURL

| 項目 | 内容 |
| メソッド | POST |
| URL | `http://localhost:8000/api/analyze-food` |
| 説明 | トリミングした料理の写真、またはメニューのテキストを送信するために使用します。AIが料理を識別し、データベースから詳細情報を取得します。 |

## 2. リクエスト(重要)

**Content-Type: `multipart/form-data`** — ブラウザに自動設定させてください。fetchリクエストで Content-Type ヘッダーを手動で設定しないでください。

**Body:** `FormData` を使ってデータを送信する必要があります。

| フィールド | 型   | 説明                         |
| ---------- | ---- | ---------------------------- |
| `file`     | File | トリミング済みの画像ファイル |

### fetchのサンプルコード

```js
const formData = new FormData();
formData.append("file", croppedImageFile);
const response = await fetch("http://localhost:8000/api/analyze-food", {
  method: "POST",
  body: formData,
  // headers: { "Content-Type": "..." } は追加しないこと
});
const result = await response.json();
```

## 3. レスポンス(成功時)

リクエストが成功すると(ステータス200)、データカードに表示するための以下のJSON構造が返されます。

```json
{
  "status": "success",
  "detected_name": "Tom Yum Goong",
  "message": "Food found successfully.",
  "data": {
    "food_id": 1,
    "name_en": "Tom Yum Goong",
    "name_th": "ต้มยำกุ้ง",
    "name_jp": "トムヤムクン",
    "description": {
      "en": "...",
      "th": "...",
      "jp": "..."
    },
    "ingredients": ["shrimp", "lemongrass", "chili"],
    "spicy_level": "High",
    "calories": 90,
    "protein": 10.0,
    "carbs": 5.0,
    "fat": 4.0,
    "how_to_eat": {
      "en": "...",
      "th": "...",
      "jp": "..."
    },
    "source_url": "https://..."
  }
}
```

### レスポンスのフィールド

| フィールド                             | 例                                       | 用途                               |
| -------------------------------------- | ---------------------------------------- | ---------------------------------- |
| `status`                               | success                                  | リクエストが成功したかどうかを示す |
| `detected_name`                        | Tom Yum Goong                            | AIが識別した料理名                 |
| `message`                              | Food found successfully.                 | レスポンスのステータスメッセージ   |
| `data.food_id`                         | 1                                        | データベース上の一意の料理ID       |
| `data.name_en` / `name_th` / `name_jp` | Tom Yum Goong / ต้มยำกุ้ง / トムヤムクン | 英語・タイ語・日本語の料理名       |
| `data.description`                     | en / th / jp                             | 3言語での料理の説明                |
| `data.ingredients`                     | shrimp, lemongrass, chili                | 主な材料                           |
| `data.spicy_level`                     | High                                     | 辛さレベル                         |
| `data.calories`                        | 90                                       | カロリー                           |
| `data.protein`                         | 10.0                                     | タンパク質量                       |
| `data.carbs`                           | 5.0                                      | 炭水化物量                         |
| `data.fat`                             | 4.0                                      | 脂質量                             |
| `data.how_to_eat`                      | en / th / jp                             | 3言語での料理の食べ方              |
| `data.source_url`                      | https://...                              | 料理情報の出典URL                  |

## 4. エラーハンドリング

| ステータス | エラー                | 意味                                                                 |
| ---------- | --------------------- | -------------------------------------------------------------------- |
| 400        | Bad Request           | アップロードされたファイルが画像ではない                             |
| 422        | Unprocessable Content | bodyに file が含まれていない、またはFormDataではなくJSONで送信された |
| 500        | Internal Server Error | AI処理の失敗、またはデータベースのエラー                             |

## 5. フロントエンド連携チェックリスト

- POSTメソッドでエンドポイントを呼び出す
- `FormData` オブジェクトを作成する
- フィールド名 `"file"` でトリミング済み画像を append する
- FormDataをそのまま fetch の body に渡す
- `"Content-Type"` ヘッダーを手動で設定しない
- `response.json()` でレスポンスをパースする
- 返ってきた `data` オブジェクトを使って料理データカードを表示する
- HTTP 400 / 422 / 500 のエラーを適切に処理する

**エンドポイントはフロントエンド連携の準備が整っています。**

---

ちょうど第1ゴールのトリミング完了までができていれば、その次の「確認ページ → AIへ送信 → 情報ページ」がこの仕様でつながりますね。実装コードが必要であれば言ってください。
