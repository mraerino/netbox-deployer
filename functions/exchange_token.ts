import fetch from "node-fetch";
import qs from "qs";
import { encryptToken, decryptToken } from "./lib/crypto";

declare global {
  const HEROKU_APP_SECRET: string;
}

export const handler = async (
  event: AWSLambda.APIGatewayEvent
): Promise<AWSLambda.APIGatewayProxyResult> => {
  if (HEROKU_APP_SECRET === "") {
    console.error("HEROKU_APP_SECRET is undeclared in the environment");
    return { statusCode: 500, body: "Internal server error" };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 400, body: "Invalid request" };
  }

  if (event.queryStringParameters === null) {
    return { statusCode: 400, body: "Missing request params" };
  }

  try {
    const { grant_type } = event.queryStringParameters;
    switch (grant_type) {
      case "authorization_code":
        return exchangeAuthCode(event.queryStringParameters);
      case "refresh_token":
        return exchangeRefreshToken(event.queryStringParameters);
    }

    return {
      statusCode: 400,
      body: JSON.stringify({ message: `Invalid token type: ${grant_type}` })
    };
  } catch (err) {
    return { statusCode: 500, body: err.toString() };
  }
};

const tokenURL = "https://id.heroku.com/oauth/token";

interface HerokuTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token: string;
  token_type: string;
  user_id: string;
  session_nonce: string;
}

const exchangeAuthCode = async ({
  code
}: Record<string, string>): Promise<AWSLambda.APIGatewayProxyResult> => {
  if (!code) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "Missing code to exchange" })
    };
  }

  const resp = await fetch(
    `${tokenURL}?${qs.stringify({
      grant_type: "authorization_code",
      code,
      client_secret: HEROKU_APP_SECRET
    })}`,
    { method: "POST" }
  );
  if (!resp.ok) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Failed to echange token",
        error: await resp.text()
      })
    };
  }

  const {
    refresh_token,
    ...tokenResp
  }: HerokuTokenResponse = await resp.json();

  return {
    statusCode: 200,
    body: JSON.stringify({
      refresh_token: encryptToken(refresh_token, HEROKU_APP_SECRET),
      ...tokenResp
    })
  };
};

const exchangeRefreshToken = async ({
  refresh_token
}: Record<string, string>): Promise<AWSLambda.APIGatewayProxyResult> => {
  if (!refresh_token) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "Missing refresh token" })
    };
  }

  const decryptedToken = decryptToken(refresh_token, HEROKU_APP_SECRET);

  const resp = await fetch(
    `${tokenURL}?${qs.stringify({
      grant_type: "refresh_token",
      refresh_token: decryptedToken,
      client_secret: HEROKU_APP_SECRET
    })}`,
    { method: "POST" }
  );
  if (!resp.ok) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Failed to echange token",
        error: await resp.text()
      })
    };
  }

  const {
    refresh_token: newRefreshToken,
    ...tokenResp
  }: HerokuTokenResponse = await resp.json();

  return {
    statusCode: 200,
    body: JSON.stringify({
      refresh_token: encryptToken(newRefreshToken, HEROKU_APP_SECRET),
      ...tokenResp
    })
  };
};
