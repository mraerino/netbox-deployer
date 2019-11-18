import HerokuPlatformApi from "@heroku-cli/schema";
import { useMemo } from "react";

import { useAccessToken } from "./auth";
import { readFile as gitReadFile } from "./git";

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

  const readFile = (project: string, filepath: string) =>
    gitReadFile(project, filepath, token);

  return { getApps, readFile };
};
