import React from "react";

import { useAccessToken } from "./auth";

export const ListApps: React.FC = () => {
  const token = useAccessToken();
  return <p>Listing Apps with token: {token}</p>;
};
