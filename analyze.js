exports.handler = async function (event, context) {

  // ── السماح فقط بطلبات POST ──
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method Not Allowed" }),
    };
  }

  // ── CORS Headers ──
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };

  // ── معالجة Preflight ──
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  try {
    // ── استقبال البيانات من الموقع ──
    const body = JSON.parse(event.body);
    const { messages } = body;

    if (!messages || !Array.isArray(messages)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Invalid request: messages required" }),
      };
    }

    // ── API Key من Netlify Environment Variables ──
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: "API Key not configured" }),
      };
    }

    // ── إرسال الطلب إلى Claude API ──
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1200,
        messages: messages,
      }),
    });

    const data = await response.json();

    // ── إرجاع النتيجة للموقع ──
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(data),
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Server error: " + error.message }),
    };
  }
};