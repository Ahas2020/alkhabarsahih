const https = require("https");
const crypto = require("crypto");

// ══════════════════════════════════════════
// CONFIG
// ══════════════════════════════════════════
const RESEND_API_KEY = "re_RFWsQkpo_L8s14pPrujqQxAN66PKJ23Aa";
const FROM_EMAIL = "noreply@alkhabarsahih.com";
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
// تحديد الخطة من المبلغ أو الاسم
// ══════════════════════════════════════════
function getPlan(amount, tierName) {
  const name = (tierName || "").toLowerCase();
  const price = parseFloat(amount || 0);

  if (name.includes("basic") || name.includes("أساسي") || price <= 1) return "basic";
  if (name.includes("premium") || name.includes("مميز") || price <= 3) return "premium";
  if (name.includes("inst") || name.includes("مؤسسي") || price >= 5) return "institutional";
  return "basic";
}

// ══════════════════════════════════════════
// إرسال الكود عبر Resend
// ══════════════════════════════════════════
function sendEmail(toEmail, toName, code, plan) {
  const planNames = {
    basic: "أساسي 📰 — 30 تحليلاً شهرياً",
    premium: "مميز 🎯 — تحليلات غير محدودة",
    institutional: "مؤسسي 🏛️ — جميع المميزات"
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
        1. افتح الموقع: <a href="https://alkhabarsahih.com" style="color:#4f8ef7">alkhabarsahih.com</a><br>
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
// MAIN HANDLER — يدعم Ko-fi + Lemon Squeezy
// ══════════════════════════════════════════
exports.handler = async function(event, context) {

  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json"
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method Not Allowed" }) };
  }

  try {
    const payload = JSON.parse(event.body);
    console.log("Webhook received:", JSON.stringify(payload).substring(0, 400));

    let customerEmail = "";
    let customerName = "";
    let plan = "basic";

    // ── Ko-fi Webhook ──
    if (payload.type === "Donation" || payload.type === "Subscription" || payload.kofi_transaction_id) {
      console.log("Ko-fi webhook detected");

      customerEmail = payload.email || "";
      customerName = payload.from_name || "عزيزي المشترك";
      const amount = payload.amount || "1";
      const tierName = payload.tier_name || "";

      console.log("Ko-fi customer:", customerEmail, customerName);
      console.log("Ko-fi amount:", amount, "tier:", tierName);

      plan = getPlan(amount, tierName);
    }

    // ── Lemon Squeezy Webhook ──
    else if (payload.meta?.event_name) {
      console.log("Lemon Squeezy webhook detected");

      const eventName = payload.meta.event_name;
      if (eventName !== "order_created" && eventName !== "subscription_created") {
        return { statusCode: 200, headers, body: JSON.stringify({ message: "Event ignored" }) };
      }

      const data = payload.data?.attributes || {};
      customerEmail = data.user_email || data.email || "";
      customerName = data.user_name || "عزيزي المشترك";
      const productName = data.first_order_item?.product_name || "";
      plan = getPlan(null, productName);
    }

    else {
      console.log("Unknown webhook format:", Object.keys(payload));
      return { statusCode: 200, headers, body: JSON.stringify({ message: "Unknown format" }) };
    }

    // ── إرسال الكود ──
    if (!customerEmail) {
      console.log("No email found");
      return { statusCode: 200, headers, body: JSON.stringify({ message: "No email" }) };
    }

    const code = generateCode(plan);
    console.log(`Generated: ${code} for ${customerEmail} plan: ${plan}`);

    await sendEmail(customerEmail, customerName, code, plan);
    console.log(`✅ Code sent to ${customerEmail}`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true })
    };

  } catch (error) {
    console.error("Webhook error:", error.message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
