import { NextRequest, NextResponse } from "next/server";

// Structured data Vapi extracts from the conversation transcript
interface CallerData {
  callerName?: string;
  callerPhone?: string;
  property?: string;
  issue?: string;
  isEmergency?: boolean;
  callType?: "emergency" | "routine_maintenance" | "leasing" | "tenant_question" | "other";
}

interface VapiEndOfCallReport {
  type: "end-of-call-report";
  endedReason: string;
  call: {
    id: string;
    status: string;
    customer?: { number: string };
  };
  transcript?: string;
  recordingUrl?: string;
  summary?: string;
  durationSeconds?: number;
  analysis?: {
    summary?: string;
    structuredData?: CallerData;
  };
}

interface VapiWebhookPayload {
  message: { type: string } & Partial<VapiEndOfCallReport>;
}

async function sendSMS(to: string, message: string) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    console.error("Twilio credentials not configured");
    return;
  }

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
      },
      body: new URLSearchParams({ To: to, From: fromNumber, Body: message }),
    }
  );

  if (!response.ok) {
    console.error("SMS failed:", await response.text());
  }
}

async function sendEmail(to: string, subject: string, html: string) {
  const resendApiKey = process.env.RESEND_API_KEY;

  if (!resendApiKey) {
    console.error("Resend API key not configured");
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${resendApiKey}`,
    },
    body: JSON.stringify({
      from: "onboarding@resend.dev",
      to,
      subject,
      html,
    }),
  });

  if (!response.ok) {
    console.error("Email failed:", await response.text());
  }
}

export async function POST(request: NextRequest) {
  try {
    // Quick test: POST with header x-test: true to verify email works
    if (request.headers.get("x-test") === "true") {
      await sendEmail(
        "deniz@bradmanagement.com",
        "Resend test ✅",
        "<p>If you got this, Resend works.</p>"
      );
      return NextResponse.json({ ok: true });
    }

    const rawBody = await request.text();
    const payload: VapiWebhookPayload = JSON.parse(rawBody);
    const message = payload.message;

    // Only process end-of-call reports — ignore status updates, assistant requests, etc.
    if (message?.type !== "end-of-call-report") {
      return NextResponse.json({ received: true });
    }

    const report = message as VapiEndOfCallReport;
    const data = report.analysis?.structuredData ?? {};

    // Fall back to raw caller ID if the AI didn't capture a phone number during the call
    const callerName = data.callerName || "Unknown";
    const callerPhone = data.callerPhone || report.call.customer?.number || "Unknown";
    const property = data.property || "Not provided";
    const issue = data.issue || report.analysis?.summary || report.summary || "See transcript";
    // isEmergency from structured data is most reliable; fall back to transfer detection
    const isEmergency = data.isEmergency ?? report.endedReason === "transfer";

    console.log("Vapi call ended:", {
      callId: report.call.id,
      callerPhone,
      isEmergency,
      callType: data.callType,
      endedReason: report.endedReason,
    });

    const emergencyPhone = process.env.EMERGENCY_SMS_NUMBER || "+15033813891";
    const notificationEmail = process.env.NOTIFICATION_EMAIL || "deniz@bradmanagement.com";

    // Emergency SMS — send immediately, short enough to read at a glance
    if (isEmergency) {
      const sms = [
        "MOXIE EMERGENCY CALL",
        "",
        `From: ${callerName}`,
        `Phone: ${callerPhone}`,
        `Property: ${property}`,
        `Issue: ${issue}`,
        "",
        `Call ID: ${report.call.id}`,
        report.recordingUrl ? `Recording: ${report.recordingUrl}` : "",
      ]
        .filter((line) => line !== null)
        .join("\n")
        .trim();

      await sendSMS(emergencyPhone, sms);
      console.log("Emergency SMS sent to", emergencyPhone);
    }

    // Email summary — sent for every call
    const emailSubject = isEmergency
      ? `EMERGENCY: After-hours call from ${callerName} at ${property}`
      : `After-hours call from ${callerName}`;

    const headerColor = isEmergency ? "#c62828" : "#1565c0";
    const headerLabel = isEmergency ? "🚨 EMERGENCY CALL" : "📞 After-Hours Call";

    const emailHtml = `
      <h2 style="color:${headerColor};margin-bottom:4px">${headerLabel}</h2>
      ${isEmergency ? '<p style="color:#c62828;font-weight:bold;margin-top:0">Call was transferred to the on-call team.</p>' : ""}

      <h3>Caller Information</h3>
      <table cellpadding="4" style="border-collapse:collapse">
        <tr><td><strong>Name</strong></td><td>${callerName}</td></tr>
        <tr><td><strong>Phone</strong></td><td><a href="tel:${callerPhone}">${callerPhone}</a></td></tr>
        <tr><td><strong>Property</strong></td><td>${property}</td></tr>
        <tr><td><strong>Issue</strong></td><td>${issue}</td></tr>
        <tr><td><strong>Call Type</strong></td><td>${data.callType ?? "Unknown"}</td></tr>
      </table>

      <h3>Call Details</h3>
      <table cellpadding="4" style="border-collapse:collapse">
        <tr><td><strong>Call ID</strong></td><td>${report.call.id}</td></tr>
        <tr><td><strong>Duration</strong></td><td>${report.durationSeconds != null ? `${Math.round(report.durationSeconds)}s` : "N/A"}</td></tr>
        <tr><td><strong>Ended</strong></td><td>${report.endedReason}</td></tr>
        <tr><td><strong>Emergency</strong></td><td>${isEmergency ? "YES — transferred to on-call" : "No"}</td></tr>
      </table>

      ${
        report.analysis?.summary
          ? `<h3>AI Summary</h3><p>${report.analysis.summary}</p>`
          : ""
      }

      ${
        report.transcript
          ? `<h3>Transcript</h3>
             <pre style="background:#f5f5f5;padding:12px;border-radius:4px;font-size:13px;white-space:pre-wrap;line-height:1.5">${report.transcript}</pre>`
          : ""
      }

      ${
        report.recordingUrl
          ? `<h3>Recording</h3><p><a href="${report.recordingUrl}">Listen to call recording</a></p>`
          : ""
      }

      <hr style="margin-top:24px">
      <p style="color:#999;font-size:12px">Sent by Moxie Voice AI</p>
    `;

    await sendEmail(notificationEmail, emailSubject, emailHtml);
    console.log("Email sent to", notificationEmail);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Vapi webhook error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
