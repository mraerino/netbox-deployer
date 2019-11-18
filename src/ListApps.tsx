import React, { useEffect, useState } from "react";
import { RouteComponentProps } from "@reach/router";
import HerokuPlatformApi from "@heroku-cli/schema";

import { useHerokuClient } from "./heroku";

export const ListApps: React.FC<RouteComponentProps> = () => {
  const client = useHerokuClient();
  const [loading, setLoading] = useState(true);
  const [apps, setApps] = useState<HerokuPlatformApi.App[]>([]);

  useEffect(() => {
    if (client === null) {
      return;
    }

    client
      .getApps()
      .then(setApps)
      .catch(console.error)
      .then(() => setLoading(false));
  }, [client]);

  useEffect(() => {
    if (apps.length < 1 || !client) {
      return;
    }
    for (const app of apps) {
      client
        .readFile(app.name!, "heroku.yml")
        .then((buf: Uint8Array) =>
          console.log(app.name, new TextDecoder("utf-8").decode(buf))
        )
        .catch(e => console.error(app.name, e));
    }
  }, [apps, client]);

  if (loading) {
    return <p>Loading...</p>;
  }

  return (
    <div>
      {apps.map((app: HerokuPlatformApi.App) => (
        <div key={app.id}>{app.name}</div>
      ))}
    </div>
  );
};
