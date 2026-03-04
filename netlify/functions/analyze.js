const https = require("https");

exports.handler = async function (event, context) {

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method Not Allowed" }) };
  }

  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  try {
    const body = JSON.parse(event.body);
    const { messages } = body;

    if (!messages || !Array.isArray(messages)) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid request" }) };
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: "API Key not configured" }) };
    }

    const requestBody = JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1200,
      messages: messages,
    });

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
        let responseData = "";
        res.on("data", (chunk) => { responseData += chunk; });
        res.on("end", () => {
          try {
            resolve(JSON.parse(responseData));
          } catch (e) {
            reject(new Error("Failed to parse response"));
          }
        });
      });

      req.on("error", (e) => reject(e));
      req.write(requestBody);
      req.end();
    });

    return { statusCode: 200, headers, body: JSON.stringify(data) };

  } catch (error) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: "Server error: " + error.message }) };
  }
};
