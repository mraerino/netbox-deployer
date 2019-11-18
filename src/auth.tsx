import React, { useEffect, useCallback, useReducer, useContext } from "react";
import randomBytes from "random-bytes";
import qs from "qs";

const LS_KEY_NONCE = "heroku_oauth_nonce";
const LS_KEY_AUTH = "heroku_oauth_info";

const authorize = async () => {
  const nonce = (await randomBytes(60)).toString("base64");
  window.localStorage.setItem(LS_KEY_NONCE, nonce);
  window.location.href = `https://id.heroku.com/oauth/authorize?${qs.stringify({
    client_id: process.env.REACT_APP_HEROKU_APP_ID,
    response_type: "code",
    scope: "write read-protected",
    state: JSON.stringify({ nonce, originalURL: window.location.href })
  })}`;
};

function exchangeToken(
  type: "authorization_code",
  params: { code: string }
): Promise<HerokuTokenResponse>;
function exchangeToken(
  type: "refresh_token",
  params: { refresh_token: string }
): Promise<HerokuTokenResponse>;
async function exchangeToken(
  grant_type: "authorization_code" | "refresh_token",
  params: any
): Promise<HerokuTokenResponse> {
  const resp = await fetch(
    `/.netlify/functions/exchange_token?${qs.stringify({
      grant_type,
      ...params
    })}`,
    { method: "POST" }
  );
  if (!resp.ok) {
    console.error("Failure in token exchange:", await resp.text());
    throw new Error("Failed exchanging token");
  }
  return resp.json();
}

const exchangeRefreshToken = async (refresh_token: string) =>
  exchangeToken("refresh_token", { refresh_token });
const exchangeCode = async (code: string) =>
  exchangeToken("authorization_code", { code });

interface TokenInfo extends HerokuTokenResponse {
  expires_at: number;
}

const AccessTokenContext = React.createContext("");
export const useAccessToken = () => useContext(AccessTokenContext);

interface AuthState {
  authKnown: boolean;
  error: string;
  tokenInfo: TokenInfo | null;
}
type AuthAction =
  | { type: "error"; error: string }
  | { type: "tokenPresent"; tokenInfo: TokenInfo }
  | { type: "detectionFinished" };
const initialState: AuthState = {
  authKnown: false,
  error: "",
  tokenInfo: null
};
const authReducer: React.Reducer<AuthState, AuthAction> = (
  state: AuthState,
  action: AuthAction
) => {
  switch (action.type) {
    case "error":
      return {
        ...state,
        authKnown: true,
        error: action.error,
        tokenInfo: null
      };
    case "tokenPresent":
      return {
        authKnown: true,
        error: "",
        tokenInfo: action.tokenInfo
      };
    case "detectionFinished":
      return {
        ...state,
        authKnown: true
      };
  }
  return state;
};

export const HerokuAuthWrapper: React.FC = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);
  const setTokenInfo = useCallback(
    (tokenInfo: TokenInfo) => dispatch({ type: "tokenPresent", tokenInfo }),
    [dispatch]
  );
  const setAuthError = useCallback(
    (error: string) => {
      window.localStorage.removeItem(LS_KEY_AUTH);
      dispatch({ type: "error", error });
    },
    [dispatch]
  );
  const setDetectionFinished = useCallback(
    () => dispatch({ type: "detectionFinished" }),
    [dispatch]
  );

  const setInfoFromExchange = useCallback(
    (herokuAuth: HerokuTokenResponse) => {
      const tokenInfo: TokenInfo = {
        ...herokuAuth,
        expires_at: Date.now() + herokuAuth.expires_in
      };
      window.localStorage.setItem(LS_KEY_AUTH, JSON.stringify(tokenInfo));
      setTokenInfo(tokenInfo);
    },
    [setTokenInfo]
  );

  const handleCallback = useCallback(async (): Promise<string> => {
    const { code, state } = qs.parse(window.location.search.substr(1));
    if (!code || !state) {
      setAuthError("Missing request parameters from auth callback");
      return "/";
    }

    try {
      const { nonce, originalURL } = JSON.parse(state);
      if (nonce !== window.localStorage.getItem(LS_KEY_NONCE)) {
        setAuthError("Invalid request: state did not match");
        return "/";
      }

      const herokuAuth = await exchangeCode(code);
      setInfoFromExchange(herokuAuth);
      return originalURL;
    } catch (e) {
      setAuthError(`Failed authorizing: ${e.message}`);
    }
    return "/";
  }, [setAuthError, setInfoFromExchange]);

  const checkTokenInfo = useCallback(async () => {
    const authInfo = window.localStorage.getItem(LS_KEY_AUTH);
    if (authInfo === null) {
      setDetectionFinished();
      return;
    }

    try {
      let tokenInfo: TokenInfo = JSON.parse(authInfo);
      if (tokenInfo.expires_at < Date.now()) {
        const herokuAuth = await exchangeRefreshToken(tokenInfo.refresh_token);
        setInfoFromExchange(herokuAuth);
        return;
      }
      setTokenInfo(tokenInfo);
    } catch (e) {
      window.localStorage.removeItem(LS_KEY_AUTH);
      setAuthError(`Failed loading auth info from storage: ${e.message}`);
    }
  }, [setTokenInfo, setInfoFromExchange, setAuthError, setDetectionFinished]);

  useEffect(() => {
    if (window.location.pathname === "/callback") {
      handleCallback().then((url: string) => {
        window.location.href = url;
      });
      return;
    }
    checkTokenInfo();
  }, [handleCallback, checkTokenInfo]);

  if (!state.authKnown) {
    return <p>Loading...</p>;
  }

  return (
    <div>
      {state.error !== "" && <p>{state.error}</p>}
      {state.tokenInfo === null ? (
        <button
          className="bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded"
          onClick={() => authorize()}
        >
          Login using Heroku
        </button>
      ) : (
        <AccessTokenContext.Provider value={state.tokenInfo.access_token}>
          {children}
        </AccessTokenContext.Provider>
      )}
    </div>
  );
};
