const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY;
const DEFAULT_HEYGEN_BASE_URL = "https://api.heygen.com";

export async function POST() {
  try {
    if (!HEYGEN_API_KEY) {
      throw new Error("API key is missing from environment configuration");
    }

    const baseApiUrl =
      process.env.NEXT_PUBLIC_BASE_API_URL ?? DEFAULT_HEYGEN_BASE_URL;

    const response = await fetch(`${baseApiUrl}/v1/streaming.create_token`, {
      method: "POST",
      headers: {
        "x-api-key": HEYGEN_API_KEY,
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `HeyGen token request failed (${response.status} ${response.statusText}): ${errorBody}`,
      );
    }

    const data = await response.json();
    const token = data?.data?.token;

    if (!token) {
      throw new Error("HeyGen token missing from response payload");
    }

    return new Response(token, {
      status: 200,
      headers: {
        "Content-Type": "text/plain",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Error retrieving access token:", error);

    return new Response("Failed to retrieve access token", {
      status: 500,
    });
  }
}
