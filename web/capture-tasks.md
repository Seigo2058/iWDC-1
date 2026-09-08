## 実装スコープ

- `/` … ホーム(撮影ボタンのみ)= 独立したルート
- `/capture` … 撮影 → トリミング → 確認 を1つのルート内で管理

## 各用途のライブラリ

| 用途 | ライブラリ | 備考 |
| 撮影 | ブラウザ標準 `<input capture>` | カメラ系コンポーネントは全て `"use client"**react-easy-crop` は `window` を参照するので、必要に応じて `next/dynamic` + `ssr: false` で読み込みます。 |
| トリミング | `react-cropper` | |
| 画像圧縮・リサイズ | `browser-image-compression` | |
| ステップ間の状態管理 | `zustand` | |
| 多言語(英/タイ/日) | `i18next & react-i18next` | 実装済み(`web/i18n.ts`)。英/タイ/日の3言語のためルーティングは `[lang]` 配下に統一する。 |
| アイコン | `lucide-react` | |
| HEIC変換(iOS対策) | `heic2any` | |

## 前提・既知の課題

- リポジトリは `web`(Next.js 16.3.3 / React 19) と `ai`(FastAPI, OCR取り込み用 `POST /documents`) のモノレポ。**今回はAIバックエンドとの連携はスコープ外（フロントのみ）**とする。将来の接続点として、確定処理は `submitPhoto(finalImage)` という単一関数に切り出しておく。
- `web/app/[lang]/layout.tsx` `page.tsx` は空ファイルとして用意済み。**ルーティングは `[lang]` 配下に統一する**（`/`, `/capture` ではなく `/[lang]`, `/[lang]/capture`）。
- `web/i18n.ts` に既存バグあり: `th: { common: jaCommon }` となっており、タイ語ロケールに日本語リソースが読み込まれてしまう（正しくは `thCommon`）。`[lang]=th` を実際に使うため、実装時に1行修正する。
- このNext.jsバージョンは学習データと異なる破壊的変更を含む（`web/AGENTS.md` の指示通り `node_modules/next/dist/docs` を確認する）。特に **`middleware.ts` はNext.js 16で廃止され `proxy.ts`（`export function proxy(request: NextRequest)`）に置き換わっている**。実装時はこの命名・シグネチャに従うこと。
- `react-cropper` / `browser-image-compression` / `zustand` / `lucide-react` / `heic2any` は package.json 未導入。

## 1. スコープ / ルーティング構成

| ルート | 役割 |
| `web/proxy.ts` | アクセス時のロケール判定（`Accept-Language` 等）を行い、`/` を `/{lang}` にリダイレクト。静的アセット・`_next` 等は matcher で除外。 |
| `web/app/[lang]/layout.tsx` | `lang` パラメータが `en/ja/th` のいずれかかを検証（不正値は `notFound()`）。i18next に `changeLanguage(lang)` を適用するクライアント側 Provider をラップ。 |
| `web/app/[lang]/page.tsx` | ホーム画面。撮影ボタンのみを表示する独立ルート。 |
| `web/app/[lang]/capture/page.tsx` | 撮影 → トリミング → 確認 を1ルート内でステート遷移として管理するオーケストレーター（`"use client"`）。 |
| `web/app/page.tsx`（既存） | フォールバック用に最小化し、`redirect()` でデフォルトロケールへ転送するだけにする。 |

### 状態管理

`zustand` で以下を管理する専用ストアを作成する（例 `web/lib/store/useCaptureStore.ts`）。

```
step: 'capture' | 'crop' | 'confirm'
rawImage: Blob | null       // 撮影直後（HEIC変換済み）
croppedImage: Blob | null   // トリミング後
finalImage: Blob | null     // 圧縮後の最終画像
```

Blob はシリアライズ不可のためページリロードで状態はリセットされる想定（永続化は要件外。リロードで最初からやり直しになる点は既知の制約として明記する）。

## 2. 各機能の要件定義

### 2-1. Take Photo Button（ホーム画面 `/[lang]`）

- 単一の主要ボタン（`lucide-react` のカメラアイコン + i18n テキスト）を中央配置。
- クリック時: `useCaptureStore` を初期状態にリセットしてから `/[lang]/capture` へ遷移（前回セッションの残留状態を防止）。
- 言語切替UIは本要件では対象外（別タスク）とし、`common.json` の `siteTitle` 等の表示のみ多言語対応する。

### 2-2. Taking Photo Page / Take Photo（`/capture` の `step: 'capture'`）

- マウント時に非表示の `<input type="file" accept="image/*" capture="environment">` を自動発火し、端末のカメラ（背面優先）を起動する。
- ユーザーがキャンセルした場合（`change` イベント未発火）に備え、手動で再度カメラを開ける「撮影する」ボタンを常設する（無限ローディングを避ける）。
- ファイル取得後のバリデーション:
  - 画像MIME以外は拒否しエラーメッセージ表示。
  - HEIC/HEIF（iOSカメラの既定形式）は `heic2any` でJPEGに変換してから後続処理へ渡す。変換失敗時はエラー表示＋再撮影導線。
- 成功時: 変換後の画像を `rawImage` に格納し `step` を `'crop'` へ。
- 「ホームに戻る」導線でキャンセル可能（ストアをリセットしてホームへ遷移）。
- デスクトップ等カメラが無い環境では `<input capture>` が通常のファイル選択にフォールバックする仕様をそのまま許容する（要件上は不具合として扱わない）。

### 2-3. Cropping Photo Page / Cropping image（`step: 'crop'`）

- `react-cropper` を `next/dynamic(..., { ssr: false })` で読み込み（`window` 参照のためSSR不可）。
- `rawImage` を Cropper に表示し、フリーフォーム（アスペクト比固定なし）でのトリミング・ズーム・回転（左右90度）・リセット操作を提供する。
- 主操作ボタン:
  - 「次へ（トリミング確定）」: `cropper.getCroppedCanvas()` → Blob化 → `croppedImage` に格納 → `step: 'confirm'`。取得失敗時はエラー表示し再試行を促す。
  - 「撮り直す」: `rawImage` を破棄し `step: 'capture'` に戻す。

### 2-4. Confirming Photo Page / Decide Photo（`step: 'confirm'`）

- 画面表示時に `browser-image-compression` で `croppedImage` を圧縮・リサイズし `finalImage` に格納、そのプレビューを表示する（＝プレビュー＝最終出力を一致させる）。圧縮失敗時は非圧縮の `croppedImage` をフォールバック表示。
- 主操作ボタン:
  - 「確定（Decide Photo）」: 現時点ではバックエンド送信を行わず、`finalImage` を確定結果としてストアに保持したままホームへ遷移し完了を示す（トースト等）。将来 `ai` 側 `POST /documents` に接続する際に差し替えられるよう、確定処理は `submitPhoto(finalImage)` という単一関数に切り出しておく（今回はローカルで即時resolveするダミー実装）。
  - 「トリミングをやり直す」: `step: 'crop'` に戻す（`rawImage` は保持）。
  - 「撮り直す」: `rawImage` `croppedImage` を破棄し `step: 'capture'` に戻す。

## 3. 横断的な技術要件

- カメラ／トリミング／圧縮を扱うコンポーネントはすべて `"use client"`。
- `web/i18n.ts` の `th` リソースバグを `thCommon` に修正する（このロケールを実際にルーティングで使うため）。
- `web/proxy.ts` は `middleware.ts` ではなく `proxy.ts`（`export function proxy(request: NextRequest)`）として実装する（Next.js 16 の破壊的変更）。
- サポートロケールは `en / ja / th` の3つ。不正な `[lang]` 値は `notFound()`。

## 実装計画（コンポーネント/ファイル一覧）

1. `web/proxy.ts` — ロケール判定＆リダイレクト
2. `web/i18n.ts` — `th` リソースバグ修正
3. `web/app/[lang]/layout.tsx` — ロケール検証 + i18n Provider
4. `web/app/[lang]/page.tsx` — ホーム画面（Take Photo Button）
5. `web/app/[lang]/capture/page.tsx` — 撮影フローのオーケストレーター
6. `web/lib/store/useCaptureStore.ts` — zustand ストア
7. `web/components/capture/TakePhotoButton.tsx`
8. `web/components/capture/CaptureStep.tsx`
9. `web/components/capture/CropStep.tsx`
10. `web/components/capture/ConfirmStep.tsx`
11. `web/components/i18n/I18nProvider.tsx`
12. `web/app/page.tsx` — 最小化してデフォルトロケールへ `redirect()`

上記1〜12は要件定義に基づく次の実装タスクで着手する（本ドキュメントは要件定義＋実装計画までを範囲とする）。
