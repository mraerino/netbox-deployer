import React, { useMemo, useContext } from "react";
import HerokuPlatformApi from "@heroku-cli/schema";

import { useAccessToken } from "./auth";
import { RouteComponentProps } from "@reach/router";

const apiBase = "https://api.heroku.com";

enum RequestMethod {
  Get = "GET",
  Post = "POST",
  Put = "PUT",
  Delete = "DELETE"
}

class HTTPError extends Error {
  public response: Response;
  constructor(response: Response) {
    super(`Failed with status ${response.status}`);
    this.response = response;
  }
}

export const newClient = (token: string) => {
  const request = async <T, _ = {}>(
    method: RequestMethod,
    path: string,
    options: RequestInit = {}
  ): Promise<T> => {
    const resp = await fetch(`${apiBase}${path}`, {
      ...options,
      method,
      headers: {
        ...options.headers,
        Accept: "application/vnd.heroku+json; version=3",
        Authorization: `Bearer ${token}`
      }
    });
    if (!resp.ok) {
      throw new HTTPError(resp);
    }
    return resp.json();
  };

  const getApps = async () => {
    return request<HerokuPlatformApi.App[]>(RequestMethod.Get, "/apps");
  };

  const getLastBuild = async (
    app_id: string
  ): Promise<HerokuPlatformApi.Build | null> => {
    const builds = await request<HerokuPlatformApi.Build[]>(
      RequestMethod.Get,
      `/apps/${app_id}/builds`,
      {
        headers: {
          Range: "created_at; max=1, order=desc"
        }
      }
    );
    if (builds.length < 1) {
      return null;
    }
    return builds[0];
  };

  return { getApps, getLastBuild };
};

export type Client = ReturnType<typeof newClient>;

const HerokuClientContext = React.createContext<Client | null>(null);

export const withHerokuClient = (
  WrappedComponent: React.ComponentType<{ herokuClient: Client }>
): React.FC<RouteComponentProps> => {
  return props => {
    const client = useContext(HerokuClientContext);
    if (!client) {
      return <p>Waiting for Heroku Client...</p>;
    }
    return <WrappedComponent {...props} herokuClient={client} />;
  };
};

export const HerokuClientWrapper: React.FC = ({ children }) => {
  const token = useAccessToken();
  const client = useMemo(() => {
    if (!token) {
      return null;
    }
    return newClient(token);
  }, [token]);

  return <HerokuClientContext.Provider value={client} children={children} />;
};
