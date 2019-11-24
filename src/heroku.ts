import HerokuPlatformApi from "@heroku-cli/schema";
import { useMemo } from "react";

import { useAccessToken } from "./auth";

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

export const useHerokuClient = () => {
  const token = useAccessToken();
  return useMemo(() => {
    if (!token) {
      return null;
    }
    return newClient(token);
  }, [token]);
};

export const newClient = (token: string) => {
  const request = async <T>(
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
