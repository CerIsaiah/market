# Setup Guide

## 1) Google service account

1. Create a Google Cloud project.
2. Enable Google Sheets API.
3. Create a service account and generate a JSON key.
4. Share your target Google Sheet with the service account email (Editor access).

## 2) Environment variables

Copy `.env.example` to `.env` and fill:
- `OPENAI_API_KEY`
- `GOOGLE_SHEET_ID`
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_PRIVATE_KEY`
- Optional: `SUBREDDIT_ALLOWLIST` (comma-separated, supports `*` suffix for prefix match)
- Optional: `SLACK_WEBHOOK_URL`

## 3) Inbound email provider

Use Postmark or Mailgun inbound routing:
- Route incoming F5Bot emails to:
  - `POST https://<your-host>/webhooks/f5bot-email`
- Ensure payload includes at least subject + plain text body.

## 4) Run

- Install: `npm install`
- Dev: `npm run dev`
- Build: `npm run build`
- Start: `npm run start`

## 5) Manual review action logging

Send action events to:
- `POST /review/actions`

Example body:
```json
{
  "opportunityId": "abc123",
  "action": "approved",
  "reviewer": "icerven",
  "finalReply": "Helpful reply text",
  "notes": "good fit"
}
```

## 6) Weekly optimizer report

Trigger on demand:
- `POST /jobs/weekly-report`
