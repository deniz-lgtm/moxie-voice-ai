import { NextRequest, NextResponse } from "next/server";

interface BlandWebhookPayload {
  call_id: string;
  phone_number: string;
  status: "completed" | "failed" | "transferred";
  duration_seconds: number;
  recording_url?: string;
  transcript?: string;
  summary?: string;
  emergency: boolean;
  caller_info?: {
    name?: string;
    phone?: string;
    property?: string;
    issue?: string;
  };
  metadata?: Record<string, any>;
}

// Send SMS via Twilio
async function sendSMS(to: string, message: string) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    console.error("Twilio credentials not configured");
    return;
  }

  try {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
        },
        body: new URLSearchParams({
          To: to,
          From: fromNumber,
          Body: message,
        }),
      }
    );

    if (!response.ok) {
      console.error("Failed to send SMS:", await response.text());
    }
  } catch (error) {
    console.error("SMS send error:", error);
  }
}

// Send email via Resend
async function sendEmail(to: string, subject: string, html: string) {
  const resendApiKey = process.env.RESEND_API_KEY;

  if (!resendApiKey) {
    console.error("Resend API key not configured");
    return;
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: "Moxie Voice AI <calls@moxiepm.com>",
        to,
        subject,
        html,
      }),
    });

    if (!response.ok) {
      console.error("Failed to send email:", await response.text());
    }
  } catch (error) {
    console.error("Email send error:", error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload: BlandWebhookPayload = await request.json();
    
    console.log("Received Bland webhook:", {
      call_id: payload.call_id,
      phone: payload.phone_number,
      emergency: payload.emergency,
      status: payload.status,
    });

    const emergencyPhone = process.env.EMERGENCY_SMS_NUMBER || "+15033813891";
    const notificationEmail = process.env.NOTIFICATION_EMAIL || "deniz@bradmanagement.com";

    // Build notification message
    const callerName = payload.caller_info?.name || "Unknown";
    const callerPhone = payload.caller_info?.phone || payload.phone_number;
    const property = payload.caller_info?.property || "Not provided";
    const issue = payload.caller_info?.issue || payload.summary || "See transcript";

    // EMERGENCY ALERT - Send immediately via SMS
    if (payload.emergency) {
      const emergencyMessage = `🚨 MOXIE EMERGENCY CALL

From: ${callerName}
Phone: ${callerPhone}
Property: ${property}
Issue: ${issue}

Call ID: ${payload.call_id}
${payload.recording_url ? `Recording: ${payload.recording_url}` : ""}`;

      await sendSMS(emergencyPhone, emergencyMessage);
      console.log("Emergency SMS sent to", emergencyPhone);
    }

    // EMAIL SUMMARY - Send for all calls
    const emailSubject = payload.emergency 
      ? `🚨 EMERGENCY: Call from ${callerName}` 
      : `📞 After-hours call from ${callerName}`;

    const emailHtml = `
      <h2>${payload.emergency ? "🚨 EMERGENCY CALL" : "📞 After-Hours Call"}</h2>
      
      <h3>Caller Information</h3>
      <ul>
        <li><strong>Name:</strong> ${callerName}</li>
        <li><strong>Phone:</strong> <a href="tel:${callerPhone}">${callerPhone}</a></li>
        <li><strong>Property:</strong> ${property}</li>
        <li><strong>Issue:</strong> ${issue}</li>
      </ul>

      <h3>Call Details</h3>
      <ul>
        <li><strong>Call ID:</strong> ${payload.call_id}</li>
        <li><strong>Duration:</strong> ${payload.duration_seconds}s</li>
        <li><strong>Status:</strong> ${payload.status}</li>
        <li><strong>Emergency:</strong> ${payload.emergency ? "YES" : "No"}</li>
      </ul>

      ${payload.transcript ? `
      <h3>Transcript</h3>
      <pre style="background:#f5f5f5;padding:10px;border-radius:5px;">${payload.transcript}</pre>
      ` : ""}

      ${payload.recording_url ? `
      <h3>Recording</h3>
      <p><a href="${payload.recording_url}">Listen to call recording</a></p>
      ` : ""}

      <hr>
      <p><em>Sent by Moxie Voice AI</em></p>
    `;

    await sendEmail(notificationEmail, emailSubject, emailHtml);
    console.log("Email summary sent to", notificationEmail);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
