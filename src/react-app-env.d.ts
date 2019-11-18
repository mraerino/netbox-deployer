/// <reference types="react-scripts" />

interface HerokuTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token: string;
  token_type: string;
  user_id: string;
  session_nonce: string;
}

declare module "@isomorphic-git/lightning-fs";
