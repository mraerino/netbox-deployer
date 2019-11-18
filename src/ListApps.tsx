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
