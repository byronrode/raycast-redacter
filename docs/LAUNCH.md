# Cloakshot launch

The Raycast extension stays at the repository root. `website/` contains the
single-page Vite marketing site. No account or hosted editor is needed.

## Commercial model

Approved: five branded free files per local day and USD19 once-off for unlimited
unbranded use. Keep the source MIT licensed. Do not implement the proposed USD1
per-shot option for launch: it adds payment and redemption friction to a quick
clipboard workflow. A single lifetime tier is clearer and matches the approved
choice. Donations alone would remove the selected paid upgrade.

## Verification

```sh
npm ci --include=optional
npm test
npm run typecheck
npm run lint
npm run build
npm --prefix website ci --include=optional
npm run site:build
```

Open the distribution build in Raycast. Verify a new image, clipboard input,
redaction, undo, all frame backgrounds, PNG copy/save, and redacted PDF export.
Free usage counts distinct files on open; reopening today's file costs nothing.
The sixth new file is preview-only. Reset is available only in development.

## Payment gate

Use Rodehouse's Peach Payments account. Verify that this merchant is active and
can settle the advertised currency, then configure Hosted Checkout and validate
payment status server-side before issuing an Ed25519 license. Match the paid
amount, currency, product and reference. Fulfillment must be idempotent. Never
trust a browser redirect as payment proof. Preserve license retrieval on retry.
Do not ship a private signing key or a simulated checkout. The old simulation
key is revoked; existing simulated licenses no longer activate Pro.

Until verified, keep checkout visibly disabled. The production signing key is
stored outside this repository and must be provisioned to the payment backend
through secret input, never process arguments or logs.

## Raycast Store

Official requirements: https://developers.raycast.com/basics/prepare-an-extension-for-store
and https://manual.raycast.com/extensions-guidelines . The extension must be
MIT licensed and submitted as a PR to https://github.com/raycast/extensions .
The reviewed public rules do not explicitly approve or forbid this local paid
unlock; disclose the model in the PR and ask reviewers to confirm acceptance.
Publishing a PR does not mean Store availability. Review first contact is
normally within a week, subject to availability.

Keep site installation copy accurate until approval; do not link a nonexistent
Store listing. Do not include external analytics in the extension. Browser
canvas screenshots differ from the required Raycast command screenshots; label
them accurately and provide the requested command screenshots separately.

## Hosting

Vercel account `ignislabs`, team `ignis`. Use project `cloakshot`, root
`website`, production branch `develop`. Register `cloakshot.app` as canonical
and redirect `cloakshot.com` to it. Preserve unrelated DNS and email records.
Use the exact DNS values returned by Vercel domain inspection.
