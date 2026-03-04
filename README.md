# Moxie Voice AI

Standalone after-hours voice AI system for Moxie Management. Replaces AnswerConnect with an AI-powered phone agent.

## Features

- 24/7 after-hours call handling
- Emergency detection and escalation
- Maintenance request intake
- Leasing inquiry handling
- Tenant support
- Call recordings and transcripts
- SMS alerts for emergencies
- Email summaries for all calls

## Tech Stack

- Next.js 14 + TypeScript
- Bland AI (voice agent)
- Twilio (SMS notifications)
- Resend (email notifications)
- Vercel (hosting)

## Setup

### 1. Clone and Install

```bash
git clone https://github.com/deniz-lgtm/moxie-voice-ai.git
cd moxie-voice-ai
npm install
```

### 2. Environment Variables

Create `.env.local`:

```env
# Twilio (for SMS notifications)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number

# Resend (for email notifications)
RESEND_API_KEY=your_resend_api_key

# Team Notifications
EMERGENCY_SMS_NUMBER=+15033813891
NOTIFICATION_EMAIL=deniz@bradmanagement.com
```

### 3. Deploy to Vercel

```bash
vercel --prod
```

Copy the deployed URL (e.g., `https://moxie-voice-ai.vercel.app`)

### 4. Configure Bland AI

1. Go to https://bland.ai
2. Create agent named "Moxie After-Hours"
3. Choose voice: Nova or Shimmer
4. Paste the prompt from `PROMPT.md`
5. Add webhook URL: `https://your-vercel-url.vercel.app/api/webhook/bland`
6. Add transfer number for emergencies
7. Get a phone number (or forward your existing after-hours line)

### 5. Test

Call the Bland number and test:
- Emergency: "I have a water leak" → Should transfer + SMS
- Routine: "My AC is broken" → Should collect info + email summary
- Leasing: "I want to schedule a tour" → Should collect info + email

## Bland AI Prompt

See `PROMPT.md` for the complete prompt to paste into Bland.

## Notification Flow

```
Call comes in → Bland AI handles it → Webhook receives call data
                                    ↓
                    ┌───────────────┴───────────────┐
                    ↓                               ↓
            If EMERGENCY:                     All calls:
            SMS to EMERGENCY_SMS_NUMBER         Email to NOTIFICATION_EMAIL
            (immediate alert)                   (full transcript + recording)
```

## Cost Estimate

| Service | Cost |
|---------|------|
| Bland AI | $0.09/minute (~$50-100/month) |
| Twilio SMS | $0.0075/message (~$5/month) |
| Resend Email | Free tier (100/day) |
| Vercel | Free tier |
| **Total** | **~$55-105/month** |

Compare to AnswerConnect: ~$500-1000/month

## Support

For issues contact: deniz@bradmanagement.com
