/**
 * Supabase Edge Function: send-auth-email
 *
 * Intercepts ALL Supabase auth emails via the Auth Hook "Send Email".
 * Sends via Resend REST API — no SMTP involved.
 *
 * Deploy:
 *   supabase functions deploy send-auth-email
 *   supabase secrets set RESEND_API_KEY=re_...
 *
 * Then wire up in Supabase Dashboard:
 *   Authentication → Auth Hooks → Send Email → HTTP → this function URL
 */

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const FROM_EMAIL = 'noreply@pxfhockey.com';
const FROM_NAME = 'PXF Hockey';
const SITE_URL = 'https://pxfhockey.com';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    const payload = await req.json();
    const { user, email_data } = payload;

    const email = user?.email;
    const actionType: string = email_data?.email_action_type ?? '';
    const tokenHash: string = email_data?.token_hash ?? '';
    const redirectTo: string = email_data?.redirect_to ?? SITE_URL;

    if (!email || !actionType) {
      return new Response(JSON.stringify({ error: 'Missing email or action type' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    // Build the confirmation/action URL
    const confirmUrl = `${Deno.env.get('SUPABASE_URL')}/auth/v1/verify?token=${tokenHash}&type=${actionType}&redirect_to=${encodeURIComponent(redirectTo)}`;

    // Build email content based on action type
    const { subject, html } = buildEmail(actionType, confirmUrl, email_data?.token ?? '');

    // Send via Resend REST API
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to: [email],
        subject,
        html,
      }),
    });

    const resendData = await resendRes.json();

    if (!resendRes.ok) {
      console.error('[send-auth-email] Resend error:', resendData);
      return new Response(JSON.stringify({ error: 'Failed to send email', details: resendData }), {
        status: 500,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[send-auth-email] Sent ${actionType} email to ${email}, id: ${resendData.id}`);
    return new Response(JSON.stringify({ success: true, id: resendData.id }), {
      status: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });

  } catch (e: any) {
    console.error('[send-auth-email] Error:', e);
    return new Response(JSON.stringify({ error: e?.message ?? 'Internal error' }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
});

function buildEmail(actionType: string, confirmUrl: string, otp: string): { subject: string; html: string } {
  const baseStyle = `
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background: #0D1117;
    color: #FFFFFF;
    padding: 40px 20px;
    max-width: 520px;
    margin: 0 auto;
  `;
  const btnStyle = `
    display: inline-block;
    background: linear-gradient(90deg, #00C4B4, #3DFF8F);
    color: #000000;
    font-weight: 800;
    font-size: 15px;
    letter-spacing: 1px;
    text-decoration: none;
    padding: 16px 32px;
    border-radius: 12px;
    margin: 24px 0;
  `;
  const mutedStyle = `color: #8B949E; font-size: 13px;`;

  const logo = `
    <div style="margin-bottom: 32px;">
      <span style="font-size: 28px; font-weight: 800; background: linear-gradient(90deg, #00C4B4, #3DFF8F); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">PXF</span>
      <span style="font-size: 11px; font-weight: 700; color: #8B949E; letter-spacing: 5px; margin-left: 4px;">HOCKEY</span>
    </div>
  `;

  switch (actionType) {
    case 'signup':
    case 'email_confirmation':
      return {
        subject: 'Confirm your PXF Hockey account',
        html: `<div style="${baseStyle}">
          ${logo}
          <h1 style="font-size: 24px; font-weight: 800; margin-bottom: 8px;">You're almost in.</h1>
          <p style="color: #8B949E; margin-bottom: 8px;">Click below to confirm your email and activate your account.</p>
          <a href="${confirmUrl}" style="${btnStyle}">CONFIRM EMAIL</a>
          <p style="${mutedStyle}">This link expires in 24 hours. If you didn't sign up for PXF Hockey, you can ignore this email.</p>
        </div>`,
      };

    case 'recovery':
      return {
        subject: 'Reset your PXF Hockey password',
        html: `<div style="${baseStyle}">
          ${logo}
          <h1 style="font-size: 24px; font-weight: 800; margin-bottom: 8px;">Reset your password</h1>
          <p style="color: #8B949E; margin-bottom: 8px;">Click below to choose a new password for your account.</p>
          <a href="${confirmUrl}" style="${btnStyle}">RESET PASSWORD</a>
          <p style="${mutedStyle}">This link expires in 1 hour. If you didn't request a password reset, you can ignore this email.</p>
        </div>`,
      };

    case 'invite':
      return {
        subject: "You've been invited to PXF Hockey",
        html: `<div style="${baseStyle}">
          ${logo}
          <h1 style="font-size: 24px; font-weight: 800; margin-bottom: 8px;">You've been invited.</h1>
          <p style="color: #8B949E; margin-bottom: 8px;">Click below to accept your invitation and set up your account.</p>
          <a href="${confirmUrl}" style="${btnStyle}">ACCEPT INVITATION</a>
          <p style="${mutedStyle}">This link expires in 24 hours.</p>
        </div>`,
      };

    case 'magiclink':
      return {
        subject: 'Your PXF Hockey sign-in link',
        html: `<div style="${baseStyle}">
          ${logo}
          <h1 style="font-size: 24px; font-weight: 800; margin-bottom: 8px;">Sign in to PXF Hockey</h1>
          <p style="color: #8B949E; margin-bottom: 8px;">Click below to sign in. This link can only be used once.</p>
          <a href="${confirmUrl}" style="${btnStyle}">SIGN IN</a>
          <p style="${mutedStyle}">This link expires in 1 hour.</p>
        </div>`,
      };

    case 'email_change_current':
    case 'email_change_new':
      return {
        subject: 'Confirm your new email address',
        html: `<div style="${baseStyle}">
          ${logo}
          <h1 style="font-size: 24px; font-weight: 800; margin-bottom: 8px;">Confirm email change</h1>
          <p style="color: #8B949E; margin-bottom: 8px;">Click below to confirm your new email address.</p>
          <a href="${confirmUrl}" style="${btnStyle}">CONFIRM EMAIL</a>
          <p style="${mutedStyle}">This link expires in 24 hours.</p>
        </div>`,
      };

    case 'reauthentication':
      return {
        subject: 'PXF Hockey verification code',
        html: `<div style="${baseStyle}">
          ${logo}
          <h1 style="font-size: 24px; font-weight: 800; margin-bottom: 8px;">Verification code</h1>
          <p style="color: #8B949E; margin-bottom: 8px;">Enter this code to verify your identity:</p>
          <div style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #00C4B4; margin: 24px 0;">${otp}</div>
          <p style="${mutedStyle}">This code expires in 10 minutes.</p>
        </div>`,
      };

    default:
      return {
        subject: 'PXF Hockey — action required',
        html: `<div style="${baseStyle}">
          ${logo}
          <h1 style="font-size: 24px; font-weight: 800; margin-bottom: 8px;">Action required</h1>
          <a href="${confirmUrl}" style="${btnStyle}">CONTINUE</a>
        </div>`,
      };
  }
}
