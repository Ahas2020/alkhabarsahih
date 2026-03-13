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
  const email = data.email || 'unknown';
  const amount = parseFloat(data.amount || 0);
  let plan = 'basic';
  if (amount >= 5) plan = 'institutional';
  else if (amount >= 3) plan = 'premium';

  const code = plan.slice(0,4).toUpperCase() + '-' + Math.random().toString(36).substring(2,7).toUpperCase() + '-2026';

  await resend.emails.send({
    from: 'alkhabarsahih@alkhabarsahih.com',
    to: 'truenewsplatform@gmail.com',
    subject: 'New subscriber: ' + plan + ' - $' + amount,
    html: '<p>Plan: ' + plan + '</p><p>Email: ' + email + '</p><p>Code: ' + code + '</p>'
  });

  return { statusCode: 200, body: JSON.stringify({ success: true }) };
};


