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

export interface AppSetupSourceBlob {
  url: string;
  version?: string;
  checksum?: string;
}

export interface AppSetupParams {
  app: Partial<{
    locked: boolean;
    name: string;
    organization: string;
    personal: boolean;
    region: string;
    space: string;
    stack: string;
  }>;
  overrides: Partial<{
    buildpacks: string[];
    env: { [k: string]: string };
  }>;
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

  const getApp = async (id: string) => {
    return request<HerokuPlatformApi.App>(RequestMethod.Get, `/apps/${id}`);
  };

  const getAppEnv = async (app_id: string) => {
    return request<Record<string, string>>(
      RequestMethod.Get,
      `/apps/${app_id}/config-vars`
    );
  };

  const getDomains = async (app_id: string) => {
    return request<HerokuPlatformApi.Domain[]>(
      RequestMethod.Get,
      `/apps/${app_id}/domains`
    );
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

  const getLastRelease = async (
    app_id: string
  ): Promise<HerokuPlatformApi.Release | null> => {
    const releases = await request<HerokuPlatformApi.Release[]>(
      RequestMethod.Get,
      `/apps/${app_id}/releases`,
      {
        headers: {
          Range: "version; max=1, order=desc"
        }
      }
    );
    if (releases.length < 1) {
      return null;
    }
    return releases[0];
  };

  const createAppSetup = async (
    source_blob: AppSetupSourceBlob,
    params?: Partial<AppSetupParams>
  ) => {
    return request<HerokuPlatformApi.AppSetup>(
      RequestMethod.Post,
      "/app-setups",
      {
        body: JSON.stringify({
          source_blob,
          ...params
        })
      }
    );
  };

  const getAppSetup = async (app_setup_id: string) => {
    return request<HerokuPlatformApi.AppSetup>(
      RequestMethod.Get,
      `/app-setups/${app_setup_id}`
    );
  };

  return {
    getApps,
    getApp,
    getAppEnv,
    getDomains,
    getLastBuild,
    getLastRelease,
    createAppSetup,
    getAppSetup
  };
};

export type Client = ReturnType<typeof newClient>;

const HerokuClientContext = React.createContext<Client | null>(null);

export const withHerokuClient = <T extends RouteComponentProps>(
  WrappedComponent: React.ComponentType<T & { herokuClient: Client }>
): React.FC<T> => {
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
