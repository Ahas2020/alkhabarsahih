const https = require("https");
const crypto = require("crypto");

// ══════════════════════════════════════════
// CONFIG
// ══════════════════════════════════════════
const WEBHOOK_SECRET = "khabar-sahih-webhook-2026";
const RESEND_API_KEY = "re_RFWsQkpo_L8s14pPrujqQxAN66PKJ23Aa";
const FROM_EMAIL = "onboarding@resend.dev"; // مؤقتاً حتى نربط الدومين
const PLATFORM_NAME = "منصة الخبر الصحيح";

// ══════════════════════════════════════════
// توليد كود تفعيل فريد
// ══════════════════════════════════════════
function generateCode(plan) {
  const prefix = plan === "basic" ? "BASIC" : plan === "premium" ? "PREMIUM" : "INST";
  const random = crypto.randomBytes(4).toString("hex").toUpperCase();
  return `${prefix}-${random.slice(0,4)}-${random.slice(4,8)}`;
}

// ══════════════════════════════════════════
// تحديد الخطة من اسم المنتج
// ══════════════════════════════════════════
function getPlan(productName) {
  const name = (productName || "").toLowerCase();
  if (name.includes("basic") || name.includes("أساسي")) return "basic";
  if (name.includes("premium") || name.includes("مميز")) return "premium";
  if (name.includes("institutional") || name.includes("مؤسسي")) return "institutional";
  return "basic";
}

// ══════════════════════════════════════════
// إرسال الكود عبر Resend
// ══════════════════════════════════════════
function sendEmail(toEmail, toName, code, plan) {
  const planNames = {
    basic: "أساسي 📰 — 30 تحليلاً شهرياً",
    premium: "مميز 🎯 — تحليلات غير محدودة",
    institutional: "مؤسسي 🏛️ — جميع المميزات + API"
  };

  const emailBody = {
    from: `${PLATFORM_NAME} <${FROM_EMAIL}>`,
    to: [toEmail],
    subject: "🔑 كود تفعيل اشتراكك — منصة الخبر الصحيح",
    html: `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="UTF-8"></head>
<body style="font-family:Arial,sans-serif;background:#0b0d14;color:#eef0f8;padding:30px;margin:0">
  <div style="max-width:500px;margin:0 auto;background:#151822;border-radius:16px;padding:32px;border:1px solid #252838">

    <div style="text-align:center;margin-bottom:24px">
      <div style="font-size:48px">🔍</div>
      <h1 style="background:linear-gradient(135deg,#4f8ef7,#8b5cf6);-webkit-background-clip:text;-webkit-text-fill-color:transparent;font-size:22px;margin:8px 0">
        منصة الخبر الصحيح
      </h1>
      <p style="color:#6b7194;font-size:13px">كشف الأخبار المزيفة بالذكاء الاصطناعي</p>
    </div>

    <p style="font-size:15px;margin-bottom:8px">مرحباً ${toName || "عزيزي المشترك"} 👋</p>
    <p style="color:#b0b4cc;font-size:13px;line-height:1.8">
      شكراً لاشتراكك في منصة الخبر الصحيح! إليك كود التفعيل الخاص بك:
    </p>

    <div style="background:#0d0f1a;border:2px solid #4f8ef7;border-radius:12px;padding:20px;text-align:center;margin:20px 0">
      <div style="font-size:11px;color:#6b7194;margin-bottom:8px">كود التفعيل</div>
      <div style="font-size:28px;font-weight:900;color:#4f8ef7;letter-spacing:4px">${code}</div>
      <div style="font-size:11px;color:#6b7194;margin-top:8px">خطتك: ${planNames[plan]}</div>
    </div>

    <div style="background:#1c1f2e;border-radius:10px;padding:16px;margin-bottom:20px">
      <div style="font-weight:700;font-size:13px;margin-bottom:10px">⚡ كيف تفعّل حسابك؟</div>
      <div style="font-size:12px;color:#b0b4cc;line-height:2">
        1. افتح الموقع: <a href="https://truenewsplatform.netlify.app" style="color:#4f8ef7">truenewsplatform.netlify.app</a><br>
        2. انقر: 🔑 لدي اشتراك — تفعيل<br>
        3. أدخل الكود أعلاه<br>
        4. ابدأ التحليل فوراً! 🚀
      </div>
    </div>

    <p style="font-size:11px;color:#6b7194;text-align:center">
      ⚠️ احتفظ بهذا الكود — لا تشاركه مع أحد<br>
      © 2026 منصة الخبر الصحيح — جميع الحقوق محفوظة
    </p>
  </div>
</body>
</html>`
  };

  return new Promise((resolve, reject) => {
    const body = JSON.stringify(emailBody);

    const options = {
      hostname: "api.resend.com",
      path: "/emails",
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body)
      }
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", chunk => { data += chunk; });
      res.on("end", () => {
        console.log("Resend response:", res.statusCode, data);
        if (res.statusCode === 200 || res.statusCode === 201) resolve(data);
        else reject(new Error(`Resend error: ${res.statusCode} ${data}`));
      });
    });

    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

// ══════════════════════════════════════════
// MAIN HANDLER
// ══════════════════════════════════════════
exports.handler = async function(event, context) {

  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json"
  };

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method Not Allowed" }) };
  }

  try {
    // ── التحقق من الـ Secret ──
    const signature = event.headers["x-signature"] || event.headers["X-Signature"] || "";
    const expectedSig = crypto
      .createHmac("sha256", WEBHOOK_SECRET)
      .update(event.body)
      .digest("hex");

    if (signature && signature !== expectedSig) {
      console.log("Invalid signature!");
      return { statusCode: 401, headers, body: JSON.stringify({ error: "Unauthorized" }) };
    }

    // ── تحليل بيانات الطلب ──
    const payload = JSON.parse(event.body);
    console.log("Webhook event:", payload.meta?.event_name);

    const eventName = payload.meta?.event_name || "";

    if (eventName !== "order_created" && eventName !== "subscription_created") {
      return { statusCode: 200, headers, body: JSON.stringify({ message: "Event ignored" }) };
    }

    // ── استخراج بيانات المشترك ──
    const data = payload.data?.attributes || {};
    const customerEmail = data.user_email || data.email || "";
    const customerName = data.user_name || data.first_name || "مشترك جديد";
    const productName = data.first_order_item?.product_name ||
                       data.product_name || "basic";

    console.log("Customer:", customerEmail, customerName);
    console.log("Product:", productName);

    if (!customerEmail) {
      return { statusCode: 200, headers, body: JSON.stringify({ message: "No email found" }) };
    }

    // ── توليد الكود وإرساله ──
    const plan = getPlan(productName);
    const code = generateCode(plan);

    console.log(`Generated code: ${code} for plan: ${plan}`);

    await sendEmail(customerEmail, customerName, code, plan);

    console.log(`✅ Code sent successfully to ${customerEmail}`);

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
