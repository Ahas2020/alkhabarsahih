const https = require("https");
const crypto = require("crypto");

// ══════════════════════════════════════════
// CONFIG
// ══════════════════════════════════════════
const WEBHOOK_SECRET = "khabar-sahih-webhook-2026";
const EMAILJS_SERVICE_ID = "service_ahhfkjd";
const EMAILJS_TEMPLATE_ID = "template_d2z1tid";
const EMAILJS_PUBLIC_KEY = "PT78eEYyef3oDhl2E";

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
// إرسال الكود عبر EmailJS
// ══════════════════════════════════════════
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
1. افتح الموقع: https://truenewsplatform.netlify.app
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
    console.log("Payload:", JSON.stringify(payload).substring(0, 300));

    const eventName = payload.meta?.event_name || "";

    // نتعامل فقط مع الطلبات المدفوعة
    if (eventName !== "order_created" && eventName !== "subscription_created") {
      return { statusCode: 200, headers, body: JSON.stringify({ message: "Event ignored" }) };
    }

    // ── استخراج بيانات المشترك ──
    const data = payload.data?.attributes || {};
    const customerEmail = data.user_email || data.email || "";
    const customerName = data.user_name || data.first_name || "مشترك جديد";
    const productName = data.first_order_item?.product_name ||
                       data.product_name ||
                       payload.data?.relationships?.order_items?.data?.[0]?.attributes?.product_name ||
                       "basic";

    console.log("Customer:", customerEmail, customerName);
    console.log("Product:", productName);

    if (!customerEmail) {
      console.log("No email found in payload");
      return { statusCode: 200, headers, body: JSON.stringify({ message: "No email found" }) };
    }

    // ── توليد الكود وإرساله ──
    const plan = getPlan(productName);
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
