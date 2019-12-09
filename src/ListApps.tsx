import React, { useEffect, useState, useCallback } from "react";
import { RouteComponentProps } from "@reach/router";
import HerokuPlatformApi from "@heroku-cli/schema";

import { withHerokuClient, Client } from "./heroku";
import { DeployPane } from "./Setup";
import { parseVersion } from "./utils";

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
    info.last_build = {
      source_url: build.source_blob.url!,
      source_version: build.source_blob.version!
    };
    const version = parseVersion(build.source_blob.version);
    if (version !== null) {
      info.netbox_version = version;
      info.is_managed = true;
    }
  }
  return info;
};

export const ListApps: React.FC<RouteComponentProps> = withHerokuClient(
  ({ herokuClient: client }) => {
    const [loading, setLoading] = useState(true);
    const [managedApps, setManagedApps] = useState<AppInfo[]>([]);
    const [otherApps, setOtherApps] = useState<AppInfo[]>([]);

    const loadApps = useCallback(
      async (client: Client) => {
        try {
          const apps = await client.getApps();
          const transformer = getAppInfo(client);
          const appsTransformed = await Promise.all(apps.map(transformer));
          setManagedApps(appsTransformed.filter(a => a.is_managed));
          setOtherApps(appsTransformed.filter(a => !a.is_managed));
          setLoading(false);
        } catch (e) {
          console.error(e);
        }
      },
      [setManagedApps, setOtherApps, setLoading]
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
        <DeployPane />
        <h2 className="text-2xl">Managed Apps</h2>
        {managedApps.map(app => (
          <div key={app.id}>
            {app.name}@{app.netbox_version}
          </div>
        ))}
        <h2 className="text-2xl">Other Apps</h2>
        {otherApps.map(app => (
          <div key={app.id}>{app.name}</div>
        ))}
      </div>
    );
  }
);
