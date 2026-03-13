// ============================================================
// Netlify Function: webhook.js (محدّث)
// المسار: netlify/functions/webhook.js
// يستقبل Ko-fi → يرسل كود التفعيل → يُرسل تنبيه للمؤسس
// ============================================================

const { Resend } = require('resend');

const ACTIVATION_CODES = {
  basic:         { code: generateCode('BASIC'),   limit: 30    },
  premium:       { code: generateCode('PREM'),    limit: 9999  },
  institutional: { code: generateCode('INST'),    limit: 9999  },
};

function generateCode(prefix) {
  const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `${prefix}-${rand}-2026`;
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  let payload;
  try {
    payload = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: 'Invalid JSON' };
  }

  // Ko-fi webhook signature check
  const secret = process.env.WEBHOOK_SECRET || 'khabar-sahih-webhook-2026';
  if (payload.verification_token !== secret) {
    return { statusCode: 401, body: 'Unauthorized' };
  }

  const data = payload.data || payload;
  const email = data.email || data.from_name || 'غير متوفر';
  const amount = parseFloat(data.amount || 0);
  const timestamp = data.timestamp || new Date().toISOString();

  // تحديد الخطة بناءً على المبلغ
  let plan = 'basic';
  if (amount >= 5) plan = 'institutional';
  else if (amount >= 3) plan = 'premium';

  const activationCode = generateCode(plan.toUpperCase().slice(0,4));

  // ① إرسال كود التفعيل للمشترك
  try {
    await resend.emails.send({
      from: 'alkhabarsahih@alkhabarsahih.com',
      to: email,
      subject: '🔑 كود التفعيل — منصة الخبر الصحيح',
      html: `
        <div dir="rtl" style="font-family:Tajawal,Arial,sans-serif;max-width:560px;margin:0 auto;background:#0a0d1a;color:#e0e0e0;border-radius:12px;overflow:hidden;">
          <div style="background:linear-gradient(135deg,#00d4aa,#00b4ff);padding:22px;text-align:center;">
            <h2 style="margin:0;color:#000;">🎉 مرحباً بك في الخبر الصحيح!</h2>
          </div>
          <div style="padding:24px;text-align:center;">
            <p style="color:#aaa;margin-bottom:20px;">كود التفعيل الخاص بك:</p>
            <div style="background:#111827;border:2px solid #00d4aa;border-radius:10px;padding:18px;display:inline-block;margin:0 auto;">
              <span style="font-family:monospace;font-size:22px;color:#00d4aa;letter-spacing:4px;font-weight:bold;">${activationCode}</span>
            </div>
            <p style="margin-top:22px;color:#888;font-size:13px;">اذهب إلى alkhabarsahih.com واضغط "تفعيل" والصق الكود</p>
            <a href="https://alkhabarsahih.com" style="display:inline-block;margin-top:16px;background:linear-gradient(135deg,#00d4aa,#00b4ff);color:#000;padding:12px 28px;border-radius:25px;text-decoration:none;font-weight:bold;font-size:15px;">ابدأ التحليل الآن ←</a>
          </div>
          <div style="background:#05080f;padding:14px;text-align:center;">
            <p style="margin:0;font-size:11px;color:#334455;">alkhabarsahih.com | truenewsplatform@gmail.com</p>
          </div>
        </div>
      `
    });
  } catch (err) {
    console.error('Subscriber email error:', err);
  }

  // ② إرسال تنبيه فوري للمؤسس
  try {
    await resend.emails.send({
      from: 'alkhabarsahih@alkhabarsahih.com',
      to: 'truenewsplatform@gmail.com',
      subject: `🔔 مشترك جديد! خطة ${plan} — ${amount}$ — الخبر الصحيح`,
      html: `
        <div dir="rtl" style="font-family:Tajawal,Arial,sans-serif;max-width:560px;margin:0 auto;background:#0a0d1a;color:#e0e0e0;border-radius:12px;overflow:hidden;">
          <div style="background:linear-gradient(135deg,#00d4aa,#00b4ff);padding:18px;text-align:center;">
            <h2 style="margin:0;color:#000;">🎉 مشترك جديد!</h2>
          </div>
          <div style="padding:22px;">
            <table style="width:100%;border-collapse:collapse;background:#111827;border-radius:8px;">
              <tr><td style="padding:10px 14px;color:#888;font-size:13px;">الخطة</td><td style="padding:10px 14px;font-weight:bold;color:#00d4aa;">${plan.toUpperCase()} — $${amount}/شهر</td></tr>
              <tr><td style="padding:10px 14px;color:#888;font-size:13px;">الإيميل</td><td style="padding:10px 14px;">${email}</td></tr>
              <tr><td style="padding:10px 14px;color:#888;font-size:13px;">الكود المرسل</td><td style="padding:10px 14px;font-family:monospace;color:#00e5bb;">${activationCode}</td></tr>
              <tr><td style="padding:10px 14px;color:#888;font-size:13px;">الوقت</td><td style="padding:10px 14px;font-size:12px;">${new Date(timestamp).toLocaleString('ar-MA')}</td></tr>
            </table>
          </div>
          <div style="background:#05080f;padding:12px;text-align:center;">
            <p style="margin:0;font-size:11px;color:#334455;">alkhabarsahih.com</p>
          </div>
        </div>
      `
    });
  } catch (err) {
    console.error('Owner notification error:', err);
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ success: true, code: activationCode, plan })
  };
};
