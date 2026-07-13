# Glint Privacy Policy

Glint is a browser extension that helps you improve prompts on chat AI websites.

## Data Collection

Glint **does not collect, transmit, or share any personal data**. All processing is done entirely on-device in your browser.

## AI Processing

When you click a chip (Improve, Concise, Add Context, Format), Glint uses Chrome's built-in Prompt API (Gemini Nano) to rewrite your prompt. This runs entirely on your device — **no data is sent to any external server**. If the Prompt API is unavailable, Glint uses a basic local text transformation with no network access.

## What Glint Reads

Glint only reads the content of the chat input field when you **explicitly click a chip**. It does not read input on keystroke, on focus, or automatically.

## Local Storage

Glint stores the following data locally in your browser using IndexedDB:

- **Saved prompts** you choose to save
- **Memory entries** (original prompt, expanded prompt, action, URL) recorded when you use a chip
- **Variables** you define (e.g., `{{audience}}`, `{{tone}}`)
- **Folders** you create to organize saved prompts

This data never leaves your browser. It persists across sessions and can be viewed or deleted in Glint's side panel.

## Permissions

Glint requests the following Chrome permissions:

- `storage` — to save your prompts, variables, and settings locally
- `sidePanel` — to open the Glint side panel via Ctrl+Shift+P

## Third-Party Access

Glint does not use any third-party analytics, tracking, or external services. No data is sent to any remote server under any circumstances.

## Changes

If this policy changes, the version number in the Chrome Web Store listing will be updated. No material change will reduce your privacy.

## Contact

For questions about this privacy policy, open an issue at the extension's repository.
