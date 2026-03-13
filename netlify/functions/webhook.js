const { Resend } = require('resend');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  let payload;
  try {
    payload = JSON.parse(event.body);
  } catch (e) {
    return { statusCode: 400, body: 'Invalid JSON' };
  }

  const data = payload.data || payload;
  const email = data.email || data.from_name || null;
  const amount = parseFloat(data.amount || 0);

  let plan = 'basic';
  if (amount >= 5) plan = 'institutional';
  else if (amount >= 3) plan = 'premium';

  const code = plan.slice(0,4).toUpperCase() + '-' + Math.random().toString(36).substring(2,7).toUpperCase() + '-2026';

  if (email) {
    await resend.emails.send({
      from: 'alkhabarsahih@alkhabarsahih.com',
      to: email,
      subject: 'رمز التفعيل — منصة الخبر الصحيح',
      html: `
        <div dir="rtl" style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:30px;background:#0a0d1a;color:#ffffff;border-radius:12px;">
          <h2 style="color:#00d4aa;text-align:center;">🎉 مرحباً بك في الخبر الصحيح!</h2>
          <p style="text-align:center;color:#aaaaaa;">رمز التفعيل الخاص بك:</p>
          <div style="background:#111827;border:2px solid #00d4aa;border-radius:10px;padding:20px;text-align:center;margin:20px 0;">
            <span style="font-family:monospace;font-size:24px;color:#00d4aa;letter-spacing:4px;font-weight:bold;">${code}</span>
          </div>
          <p style="text-align:center;color:#888888;font-size:13px;">اذهب إلى الموقع واضغط تفعيل والصق الرمز</p>
          <div style="text-align:center;margin-top:20px;">
            <a href="https://alkhabarsahih.com" style="background:linear-gradient(135deg,#00d4aa,#00b4ff);color:#000000;padding:12px 30px;border-radius:25px;text-decoration:none;font-weight:bold;">ابدأ التحليل الآن ←</a>
          </div>
        </div>
      `
    });
  }

  return { statusCode: 200, body: JSON.stringify({ success: true, code: code }) };
};
