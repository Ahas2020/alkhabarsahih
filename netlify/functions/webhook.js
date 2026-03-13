const https = require("https");
const crypto = require("crypto");

const WEBHOOK_SECRET = "khabar-sahih-webhook-2026";
const EMAILJS_SERVICE_ID = "service_ahhfkjd";
const EMAILJS_TEMPLATE_ID = "template_d2z1tid";
const EMAILJS_PUBLIC_KEY = "PT78eEYyef3oDhl2E";

function generateCode(plan) {
  const prefix = plan === "basic" ? "BASIC" : plan === "premium" ? "PREMIUM" : "INST";
  const random = crypto.randomBytes(4).toString("hex").toUpperCase();
  return `${prefix}-${random.slice(0,4)}-${random.slice(4,8)}`;
}

function getPlan(amount) {
  const n = parseFloat(amount || 0);
  if (n >= 5) return "institutional";
  if (n >= 3) return "premium";
  return "basic";
}

function sendEmail(toEmail, toName, code, plan) {
  const planNames = {
    basic: "أساسي 📰 — 30 تحليلاً شهرياً",
    premium: "مميز 🎯 — تحليلات غير محدودة",
    institutional: "مؤسسي 🏛️ — جميع المميزات"
  };

  const templateParams = {
    from_name: "منصة الخبر الصحيح",
    from_email: "noreply@alkhabarsahih.com",
    to_name: toName || "عزيزي المشترك",
    to_email: toEmail,
    subject: "كود تفعيل اشتراكك — منصة الخبر الصحيح",
    message: `مرحباً ${toName || ""},

شكراً لاشتراكك في منصة الخبر الصحيح! 🎉

━━━━━━━━━━━━━━━━━━━━━
كود التفعيل الخاص بك:
${code}
━━━━━━━━━━━━━━━━━━━━━

خطتك: ${planNames[plan]}

كيف تفعّل حسابك؟
1. افتح الموقع: https://alkhabarsahih.com
2. انقر: 🔑 لدي اشتراك — تفعيل
3. أدخل الكود أعلاه
4. ابدأ التحليل فوراً!

⚠️ احتفظ بهذا الكود — لا تشاركه مع أحد.

مع تحيات فريق الخبر الصحيح 🛡️`
  };

  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      service_id: EMAILJS_SERVICE_ID,
      template_id: EMAILJS_TEMPLATE_ID,
      user_id: EMAILJS_PUBLIC_KEY,
      template_params: templateParams
    });

    const options = {
      hostname: "api.emailjs.com",
      path: "/api/v1.0/email/send",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body)
      }
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", chunk => { data += chunk; });
      res.on("end", () => {
        console.log("EmailJS response:", res.statusCode, data);
        if (res.statusCode === 200) resolve(data);
        else reject(new Error(`EmailJS error: ${res.statusCode} ${data}`));
      });
    });

    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

exports.handler = async function(event, context) {

  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json"
  };

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method Not Allowed" }) };
  }

  try {
    const rawData = decodeURIComponent(event.body.replace(/^data=/, ""));
    const payload = JSON.parse(rawData);

    console.log("Webhook type:", payload.type);
    console.log("Payload:", JSON.stringify(payload).substring(0, 300));

    const customerEmail = payload.email || "";
    const customerName = payload.from_name || "مشترك جديد";
    const amount = payload.amount || "1";

    console.log("Customer:", customerEmail, customerName);
    console.log("Amount:", amount);

    if (!customerEmail) {
      console.log("No email found in payload");
      return { statusCode: 200, headers, body: JSON.stringify({ message: "No email found" }) };
    }

    const plan = getPlan(amount);
    const code = generateCode(plan);

    console.log(`Generated code: ${code} for plan: ${plan}`);

    await sendEmail(customerEmail, customerName, code, plan);

    console.log(`✅ Code sent to ${customerEmail}`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, message: "Code sent successfully" })
    };

  } catch (error) {
    console.error("Webhook error:", error.message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Server error: " + error.message })
    };
  }
};
