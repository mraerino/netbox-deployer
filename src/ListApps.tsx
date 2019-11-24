import React, { useEffect, useState, useCallback } from "react";
import { RouteComponentProps } from "@reach/router";
import HerokuPlatformApi from "@heroku-cli/schema";

import { useHerokuClient, newClient } from "./heroku";

interface BuildInfo {
  source_url: string;
  source_version: string;
}

interface AppInfo {
  id: string;
  name: string;
  is_managed: boolean;
  netbox_version?: string;
  last_build?: BuildInfo;
}

const ManagedVersionRegex = /^netbox-heroku@([0-9.]+)$/;

const getAppInfo = (client: Client) => async (
  app: HerokuPlatformApi.App
): Promise<AppInfo> => {
  const info: AppInfo = {
    id: app.id!,
    name: app.name!,
    is_managed: false
  };
  const build = await client.getLastBuild(app.id!);
  if (
    build !== null &&
    build.source_blob &&
    build.source_blob.version &&
    build.source_blob.url
  ) {
    const matches = ManagedVersionRegex.exec(build.source_blob.version);
    info.last_build = {
      source_url: build.source_blob.url!,
      source_version: build.source_blob.version!
    };
    if (matches !== null) {
      info.netbox_version = matches[1];
      info.is_managed = true;
    }
  }
  return info;
};

type Client = ReturnType<typeof newClient>;

export const ListApps: React.FC<RouteComponentProps> = () => {
  const client = useHerokuClient();
  const [loading, setLoading] = useState(true);
  const [apps, setApps] = useState<AppInfo[]>([]);

  const loadApps = useCallback(
    async (client: Client) => {
      try {
        const apps = await client.getApps();
        const transformer = getAppInfo(client);
        const appsTransformed = await Promise.all(apps.map(transformer));
        setApps(appsTransformed);
        setLoading(false);
      } catch (e) {
        console.error(e);
      }
    },
    [setApps, setLoading]
  );

  useEffect(() => {
    if (client === null) {
      return;
    }
    loadApps(client);
  }, [client, loadApps]);

  if (loading) {
    return <p>Loading...</p>;
  }

  return (
    <div>
      {apps.map(app => (
        <div key={app.id}>
          {app.name}
          {app.is_managed && "@" + app.netbox_version}
        </div>
      ))}
    </div>
  );
};
