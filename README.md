# SmoothRizz Marketing Automation

Standalone Reddit opportunity engine that:
- Ingests F5Bot email alerts via webhook
- Scores opportunities using Google Sheets keyword rules + GPT
- Generates safe draft replies (brand + no-brand variants)
- Notifies reviewers for manual approval
- Logs actions and metrics back to Google Sheets

## Quick start

1. Copy `.env.example` to `.env` and fill credentials.
2. Install dependencies:
   - `npm install`
3. Run locally:
   - `npm run dev`

## Endpoints

- `GET /health` - service health
- `POST /webhooks/f5bot-email` - inbound F5Bot email payload
- `POST /review/actions` - reviewer action logging
- `POST /jobs/weekly-report` - generate weekly optimizer report on demand

## Google Sheet tabs

Create these tabs exactly:
- `Keywords`
- `SubredditRules`
- `RawAlerts`
- `Opportunities`
- `DraftReplies`
- `Actions`
- `Metrics`

Detailed columns and setup are in `docs/google-sheet-template.md`.

## Notes

- This project is intentionally outside `apps/` and does not use the app DB.
- Default mode is draft-only; no Reddit auto-posting is included.
