# Moxie Voice AI

Standalone after-hours voice AI system for Moxie Management. Replaces AnswerConnect with an AI-powered phone agent.

## Features

- 24/7 after-hours call handling
- Emergency detection and immediate call transfer to on-call team
- Maintenance request intake
- Leasing inquiry handling
- Tenant support
- Call recordings and transcripts
- SMS alerts for emergencies
- Email summaries for all calls

## Tech Stack

- Next.js 14 + TypeScript
- Vapi (voice AI — handles calls, extracts structured data, transfers emergencies)
- Twilio (SMS notifications)
- Resend (email notifications)
- Vercel (hosting)

## How It Works

```
Forwarded call → Vapi AI assistant handles conversation
                      ↓
          Collects name, phone, property, issue
                      ↓
          Emergency?
          ├── YES → Transfer to on-call team immediately
          └── NO  → Collect info, end call
                      ↓
          Vapi fires end-of-call webhook (with transcript + structured data)
                      ↓
          /api/webhook/vapi processes it
          ├── Emergency → SMS to EMERGENCY_SMS_NUMBER
          └── All calls → Email to NOTIFICATION_EMAIL
```

## Setup

### 1. Clone and Install

```bash
git clone https://github.com/deniz-lgtm/moxie-voice-ai.git
cd moxie-voice-ai
npm install
```

### 2. Environment Variables

Copy `.env.local.example` to `.env.local` and fill in your values:

```bash
cp .env.local.example .env.local
```

### 3. Deploy to Vercel

```bash
vercel --prod
```

Copy the deployed URL (e.g., `https://moxie-voice-ai.vercel.app`). You'll need it for the Vapi webhook.

### 4. Create the Vapi Assistant

1. Sign up at [vapi.ai](https://vapi.ai)
2. Go to **Assistants** → **Create Assistant**
3. In the top-right, click **Import** and paste the contents of `vapi-assistant.json`
4. Update the `transferCall` tool destination number (`+1XXXXXXXXXX`) to your actual emergency on-call number
5. Save the assistant

### 5. Add a Phone Number in Vapi

1. Go to **Phone Numbers** → **Buy Number** (or import your own Twilio number)
2. Assign the assistant you just created to the number
3. Forward your after-hours line to this Vapi number

### 6. Configure the Webhook

1. In Vapi, go to **Account** → **Webhooks** (or set it on the assistant)
2. Set the webhook URL to: `https://your-vercel-url.vercel.app/api/webhook/vapi`
3. Copy the webhook secret and add it to your Vercel env vars as `VAPI_WEBHOOK_SECRET`

### 7. Add Env Vars to Vercel

In your Vercel project settings → Environment Variables, add all values from `.env.local`.

### 8. Test

Call the Vapi number and test:
- **Emergency:** "I have a water leak" → Should transfer + trigger SMS alert
- **Routine:** "My AC is broken" → Should collect info + email summary
- **Leasing:** "I want to schedule a tour" → Should collect info + email

## Files

| File | Purpose |
|------|---------|
| `src/app/api/webhook/vapi/route.ts` | Webhook handler — receives call data from Vapi and sends notifications |
| `vapi-assistant.json` | Vapi assistant configuration — import into Vapi dashboard |
| `PROMPT.md` | The AI conversation prompt (embedded in `vapi-assistant.json`) |
| `.env.local.example` | Environment variable template |

## Cost Estimate

| Service | Cost |
|---------|------|
| Vapi | ~$0.05/min (~$25-60/month) |
| Twilio SMS | $0.0075/message (~$5/month) |
| Resend Email | Free tier (100/day) |
| Vercel | Free tier |
| **Total** | **~$30-65/month** |

Compare to AnswerConnect: ~$500-1000/month

## Support

For issues contact: deniz@bradmanagement.com
