# Anonymous Valentine Wish (static)

How to use

- Open `index.html` in a browser.
- Fill "To", message, optional quote and sender name.
- Click "Generate shareable link" to get a URL that contains the encoded wish data. Copy this link and share on WhatsApp or elsewhere.
- Opening the link loads `wish.html` which decodes and displays the wish anonymously.

New Gen-Z features:

- Emoji panel and sticker buttons so you can add playful reactions quickly.
- Dark neon theme with animated background blobs and confetti when the wish is generated or viewed.
- Attach a small image (embedded client-side) — it will appear when the recipient opens the wish. Keep images small to avoid very long links.
- "Share on WhatsApp" button to open WhatsApp with the link pre-filled (mobile/WhatsApp Web compatible).
- Improved "Download image" that renders a stylized PNG (includes attached image if present).

Notes

- This is a static, client-side implementation — no server is required. The wish data is encoded in the URL.
- Keep messages short; long messages create longer URLs and may not work on platforms that truncate links.
- For production, consider moving storage server-side or using short links to avoid very long URLs.

Security & privacy:

- This project stores no data on a server — all wish content is encoded into the URL. Anyone with the link can view the wish. Do not include private secrets in the message or image.

