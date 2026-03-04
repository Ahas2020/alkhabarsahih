const https = require("https");

exports.handler = async function (event, context) {

  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method Not Allowed" }) };
  }

  try {
    // ── تحقق من الـ API Key ──
    const apiKey = process.env.ANTHROPIC_API_KEY;
    console.log("API Key exists:", !!apiKey);
    console.log("API Key length:", apiKey ? apiKey.length : 0);
    console.log("API Key starts with:", apiKey ? apiKey.substring(0, 10) : "EMPTY");

    if (!apiKey) {
      console.log("ERROR: No API Key found");
      return { statusCode: 500, headers, body: JSON.stringify({ error: "API Key not configured" }) };
    }

    // ── تحقق من الـ body ──
    console.log("Raw body:", event.body ? event.body.substring(0, 100) : "EMPTY");
    const body = JSON.parse(event.body);
    const { messages } = body;
    console.log("Messages count:", messages ? messages.length : 0);

    if (!messages || !Array.isArray(messages)) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid request" }) };
    }

    const requestBody = JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1200,
      messages: messages,
    });

    console.log("Sending request to Anthropic API...");

    const data = await new Promise((resolve, reject) => {
      const options = {
        hostname: "api.anthropic.com",
        path: "/v1/messages",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "Content-Length": Buffer.byteLength(requestBody),
        },
      };

      const req = https.request(options, (res) => {
        console.log("Anthropic status code:", res.statusCode);
        let responseData = "";
        res.on("data", (chunk) => { responseData += chunk; });
        res.on("end", () => {
          console.log("Response received, length:", responseData.length);
          console.log("Response preview:", responseData.substring(0, 200));
          try {
            resolve(JSON.parse(responseData));
          } catch (e) {
            reject(new Error("Parse error: " + responseData.substring(0, 100)));
          }
        });
      });

      req.on("error", (e) => {
        console.log("Request error:", e.message);
        reject(e);
      });

      req.write(requestBody);
      req.end();
    });

    console.log("Success! Returning data.");
    return { statusCode: 200, headers, body: JSON.stringify(data) };

  } catch (error) {
    console.log("CATCH ERROR:", error.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: "Server error: " + error.message }) };
  }
};
