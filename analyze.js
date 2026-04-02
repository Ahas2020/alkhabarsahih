exports.handler = async function (event, context) {

  // ── CORS Headers — يجب أن تكون أولاً دائماً ──
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  };

  // ── معالجة Preflight OPTIONS — قبل أي شيء آخر ──
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  // ── السماح فقط بطلبات POST ──
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method Not Allowed" }),
    };
  }

  try {
    // ── استقبال البيانات من الموقع ──
    let body;
    try {
      body = JSON.parse(event.body);
    } catch (e) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Invalid JSON in request body" }),
      };
    }

    const { messages } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Invalid request: messages array required" }),
      };
    }

    // ── API Key من Netlify Environment Variables ──
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.error("ANTHROPIC_API_KEY not found in environment");
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: "API Key not configured" }),
      };
    }

    console.log("API Key exists: true");
    console.log("API Key length:", apiKey.length);
    console.log("API Key starts with:", apiKey.substring(0, 10));
    console.log("Messages count:", messages.length);
    console.log("Sending request to Anthropic API...");

    // ── System Prompt يمنع ```json ──
    const systemPrompt = `أنت محلل متخصص في التحقق من الأخبار والمعلومات.
    
CRITICAL INSTRUCTION: Return ONLY valid raw JSON. 
- Do NOT use markdown code blocks (no \`\`\`json or \`\`\`)
- Do NOT add any text before or after the JSON
- Start your response directly with { and end with }
- The JSON must be valid and parseable

Format your response as:
{
  "verdict": "true|false|misleading|unverified",
  "confidence": 0-100,
  "summary": "ملخص التحليل",
  "reasons": ["سبب 1", "سبب 2"],
  "recommendation": "التوصية"
}`;

    // ── Timeout Controller — 25 ثانية ──
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 25000);

    let response;
    try {
      response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1200,
          system: systemPrompt,
          messages: messages,
        }),
        signal: controller.signal,
      });
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError.name === "AbortError") {
        console.error("Request timed out after 25 seconds");
        return {
          statusCode: 504,
          headers,
          body: JSON.stringify({
            error: "timeout",
            message: "استغرق التحليل وقتاً طويلاً — أعد المحاولة",
          }),
        };
      }
      throw fetchError;
    }

    clearTimeout(timeoutId);

    console.log("Anthropic status code:", response.status);

    // ── معالجة أخطاء API ──
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Anthropic API error:", response.status, errorData);

      if (response.status === 401) {
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: "API Key غير صالح" }),
        };
      }
      if (response.status === 429) {
        return {
          statusCode: 429,
          headers,
          body: JSON.stringify({
            error: "rate_limit",
            message: "تم تجاوز حد الطلبات — أعد المحاولة بعد لحظات",
          }),
        };
      }
      if (response.status === 529 || response.status === 503) {
        return {
          statusCode: 503,
          headers,
          body: JSON.stringify({
            error: "api_overloaded",
            message: "الخدمة مشغولة مؤقتاً — أعد المحاولة",
          }),
        };
      }

      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({ error: "Anthropic API error: " + response.status }),
      };
    }

    const data = await response.json();
    console.log("Response received, length:", JSON.stringify(data).length);

    // ── استخراج النص من الاستجابة ──
    if (!data.content || !data.content[0] || !data.content[0].text) {
      console.error("Unexpected response structure:", JSON.stringify(data).substring(0, 200));
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: "Unexpected API response structure" }),
      };
    }

    let rawText = data.content[0].text;
    console.log("Response preview:", rawText.substring(0, 100));

    // ── تنظيف ```json إذا أرسلها Claude بالخطأ ──
    const cleanText = rawText
      .replace(/^```json\s*/gi, "")
      .replace(/^```\s*/gi, "")
      .replace(/\s*```$/gi, "")
      .trim();

    // ── محاولة Parse الـ JSON ──
    let parsedResult;
    try {
      parsedResult = JSON.parse(cleanText);
    } catch (parseError) {
      console.error("JSON parse error:", parseError.message);
      console.error("Raw text was:", rawText.substring(0, 300));

      // إذا فشل الـ parse — أرجع الـ data الأصلي للـ frontend يتعامل معه
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(data),
      };
    }

    // ── بناء الاستجابة النظيفة ──
    const cleanResponse = {
      ...data,
      content: [
        {
          ...data.content[0],
          text: JSON.stringify(parsedResult),
        },
      ],
      _parsed: parsedResult, // بيانات جاهزة مُعالجة للـ frontend
    };

    console.log("Success! Returning clean data.");

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(cleanResponse),
    };

  } catch (error) {
    console.error("Unhandled error:", error.message);
    console.error("Stack:", error.stack);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "server_error",
        message: "خطأ مؤقت في الخادم — أعد المحاولة",
        details: error.message,
      }),
    };
  }
};
