# step-up 公式HP（Cloudflare Pages 用）

このリポジトリのルートに静的サイト（index.html ほか）を置いています。

## Cloudflare Pages で公開（スマホでも数タップ）
1. Cloudflare → Workers & Pages → Create → 「Pages」→「**Connect to Git**」
2. GitHub を認可し、リポジトリ **yuki-morimori/-** を選択
3. 設定:
   - Production branch: **claude/new-session-j7qc8j**
   - Framework preset: **None**
   - Build command: **（空欄）**
   - Build output directory: **/**（ルート。`公式HP`等にしない）
4. 「Save and Deploy」→ 1〜2分で `https://<プロジェクト名>.pages.dev`

このブランチに push するたび自動で再公開されます。独自ドメイン step-up.app は公開後 Custom domains で追加。
