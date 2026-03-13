const { Resend } = require('resend');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let payload;
  try {
    payload = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: 'Invalid JSON' };
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  const data = payload.data || payload;
  const email = data.email || data.from_name || 'غير متوفر';
  const amount = parseFloat(data.amount || 0);
  const timestamp = new Date().toISOString();

  let plan = 'basic';
  if (amount >= 5) plan = 'institutional';
  else if (amount >= 3) plan = 'premium';

  const rand = Math.random().toString(36).substring(2,7).toUpperCase();
  const activationCode = `${plan.toUpperCase().slice(0,4)}-${rand}-2026`;

  try {
    await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: 'truenewsplatform@gmail.com',
      subject: `🔔 مشترك جديد! خطة ${plan} — ${amount}$`,
      html: `
        <div dir="rtl" style="font-family:Arial,sans-serif;padding:20px;">
          <h2 style="color:#00d4aa;">🎉 مشترك جديد!</h2>
          <p><strong>الخطة:</strong> ${plan} — $${amount}/شهر</p>
          <p><strong>الإيميل:</strong> ${email}</p>
          <p><strong>الكود:</strong> ${activationCode}</p>
          <p><strong>الوقت:</strong> ${timestamp}</p>
        </div>
      `
    });
  } catch (err) {
    console.error('Email error:', err.message);
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ success: true, code: activationCode })
  };
};
```

---

## Commit message:
```
Fix webhook: clean rewrite with async fix
