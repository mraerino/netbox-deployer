import React, { useCallback, useEffect, useState } from "react";
import { RouteComponentProps, navigate } from "@reach/router";
import HerokuPlatformApi from "@heroku-cli/schema";
import { LazyLog } from "react-lazylog";

import { withHerokuClient } from "./heroku";

const targetVersion = "v2.6.7";
const fallbackOrigin = "https://netbox-deploy.netlify.com";
const origin =
  window.location.hostname === "localhost"
    ? fallbackOrigin
    : window.location.origin;

export const DeployPane: React.FC = withHerokuClient(({ herokuClient }) => {
  const createSetup = useCallback(async () => {
    const setup = await herokuClient.createAppSetup(
      {
        url: `${origin}/.netlify/functions/source_blob?version=${targetVersion}`,
        version: `netbox-heroku@${targetVersion}`
      },
      { app: { region: "eu" } }
    );
    navigate(`/setup/${setup.id}`);
  }, [herokuClient]);

  return (
    <div>
      <button
        onClick={createSetup}
        className="bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded"
      >
        Deploy a Netbox
      </button>
    </div>
  );
});

const Indicator: React.FC<{
  done: boolean;
  started: boolean;
  error: boolean;
}> = ({ done, started, error }) => (
  <span>{started ? (done ? (error ? "❌" : "✅") : "⏳") : ""}</span>
);

const StatusPane: React.FC<{ setup: HerokuPlatformApi.AppSetup }> = ({
  setup
}) => (
  <div>
    <div className="border-b-1">
      Creating app...
      <Indicator
        started
        error={setup.status === "failed"}
        done={!!setup.build || setup.status !== "pending"}
      />
    </div>
    <div className="border-b-1">
      Building...
      {setup.build && (
        <>
          <Indicator
            started
            error={setup.build.status === "failed"}
            done={setup.build.status !== "pending"}
          />
          {setup.build.output_stream_url && (
            <LazyLog
              height={400}
              selectableLines
              follow={setup.build.status === "pending"}
              url={setup.build.output_stream_url}
              stream
            />
          )}
        </>
      )}
    </div>
    <div className="border-b-1">
      Start server process...
      <Indicator
        started={(setup.build && setup.build.status === "succeeded") || false}
        error={setup.status === "failed"}
        done={setup.status === "succeeded"}
      />
    </div>
    {!!setup.resolved_success_url && (
      <a
        href={setup.resolved_success_url}
        target="_blank"
        rel="noopener noreferrer"
        className="border border-purple-700 hover:bg-purple-100 text-purple-700 font-bold py-2 px-4 rounded"
      >
        Open App
      </a>
    )}
  </div>
);

enum SetupState {
  LOADING,
  INIT,
  BUILDING,
  RELEASING,
  FINISHED,
  FAILED
}

const getState = (setup: HerokuPlatformApi.AppSetup): SetupState => {
  switch (setup.status) {
    case "pending":
      return setup.build ? SetupState.BUILDING : SetupState.INIT;
    case "failed":
      return SetupState.FAILED;
    case "succeeded":
      return SetupState.FINISHED;
  }
  return SetupState.LOADING;
};

export const SetupPage = withHerokuClient<RouteComponentProps<{ id: string }>>(
  ({ id, herokuClient }) => {
    const [error, setError] = useState("");
    const [setup, setSetup] = useState<HerokuPlatformApi.AppSetup | null>(null);

    const loadSetup = useCallback(
      async (id: string) => {
        const setup = await herokuClient.getAppSetup(id);
        if (setup.status === "failed") {
          setError(setup.failure_message || "Unknown error");
        }
        setSetup(setup);
      },
      [herokuClient]
    );

    useEffect(() => {
      if (!id) {
        return;
      }

      if (setup) {
        const state = getState(setup);
        if (state === SetupState.FAILED || state === SetupState.FINISHED) {
          return;
        }
      }

      const interval = setInterval(() => loadSetup(id), 1000);
      return () => clearInterval(interval);
    }, [id, loadSetup, setup]);

    return (
      <div>
        <p>Deploy ID: {id}</p>
        {error && <p>Error: {error}</p>}
        {setup && <StatusPane setup={setup} />}
      </div>
    );
  }
);
