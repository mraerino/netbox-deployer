import React, { useState, useEffect, useCallback, useReducer } from "react";
import { RouteComponentProps } from "@reach/router";
import HerokuPlatformApi from "@heroku-cli/schema";
import { produce } from "immer";

import { withHerokuClient } from "./heroku";
import { Card, TextInput, Button, Checkbox } from "./design";
import { parseVersion } from "./utils";

interface AppSettings extends HerokuPlatformApi.App {
  build: HerokuPlatformApi.Build;
  release: HerokuPlatformApi.Release;
  version: string;
  env: Record<string, string>;
  domains: HerokuPlatformApi.Domain[];
}

type Changes = {
  app: Partial<{
    name: string;
  }>;
  env: Partial<{
    LOGIN_REQUIRED: string;
    CORS_ORIGIN_ALLOW_ALL: string;
  }>;
};

interface ChangeState {
  current: AppSettings | null;
  changes: Changes;
}

type ChangeActions =
  | {
      type: "name";
      payload: string;
    }
  | {
      type: "login_required" | "cors_allow_all";
      payload: boolean;
    }
  | {
      type: "set_current";
      payload: AppSettings;
    };

const changesReducer: React.Reducer<ChangeState, ChangeActions> = (
  state,
  action
) =>
  produce(state, draft => {
    switch (action.type) {
      case "set_current":
        draft.current = action.payload;
        break;
      case "name":
        if (action.payload !== state.current?.name) {
          draft.changes.app.name = action.payload;
        } else if (draft.changes.app.name) {
          delete draft.changes.app["name"];
        }
        break;
      case "login_required":
        if (
          action.payload !==
          isTruthy(state.current?.env.LOGIN_REQUIRED ?? "true")
        ) {
          draft.changes.env.LOGIN_REQUIRED = action.payload ? "yes" : "no";
        } else if (draft.changes.env.LOGIN_REQUIRED) {
          delete draft.changes.env["LOGIN_REQUIRED"];
        }
    }
  });

const isTruthy = (value: string): boolean =>
  ["true", "yes", "1"].indexOf(value.toLowerCase()) !== -1;

export const ManageApp = withHerokuClient<RouteComponentProps<{ id: string }>>(
  ({ herokuClient, id }) => {
    const [error, setError] = useState("");
    const [{ current: appInfo, changes }, dispatch] = useReducer(
      changesReducer,
      {
        current: null,
        changes: {
          app: {},
          env: {}
        }
      }
    );

    const loadApp = useCallback(
      async (id: string) => {
        const [app, build, release, env = {}, domains] = await Promise.all([
          herokuClient.getApp(id),
          herokuClient.getLastBuild(id),
          herokuClient.getLastRelease(id),
          herokuClient.getAppEnv(id),
          herokuClient.getDomains(id)
        ]);
        if (
          app === null ||
          build === null ||
          release === null ||
          env === null ||
          domains === null
        ) {
          setError("Failed to load all data");
          return;
        }
        const version = parseVersion(build.source_blob?.version || "");
        if (version === null) {
          setError("App not managed by this tool");
          return;
        }
        dispatch({
          type: "set_current",
          payload: { ...app, build, release, env, domains, version }
        });
      },
      [herokuClient]
    );

    useEffect(() => {
      if (id) {
        loadApp(id);
      }
    }, [id, loadApp]);

    if (error) {
      return <p>Error: {error}</p>;
    }

    if (appInfo === null) {
      return <p>Loading...</p>;
    }

    return (
      <div className="w-full max-w-md">
        <h1 className="text-2xl">
          Manage <code>{appInfo.name}</code>
        </h1>
        <Card>
          <h3 className="text-l text-gray-700 mb-4">General</h3>
          <TextInput
            label="Name"
            type="text"
            value={changes.app?.name || appInfo.name}
            onChange={ev =>
              dispatch({ type: "name", payload: ev.target.value })
            }
          />
        </Card>
        <Card>
          <h3 className="text-l text-gray-700 mb-4">Maintenance</h3>
          <Button to={`/apps/${id}/backups`}>Backups</Button>
          <p>Current Version: {appInfo.version}</p>
          <Button to={`/apps/${id}/upgrade`}>Upgrade</Button>
        </Card>
        <Card>
          <h3 className="text-l text-gray-700 mb-4">Access Control</h3>
          <Button component="button" onClick={() => alert("Superuse modal")}>
            Create a Superuser
          </Button>
          <Checkbox
            label="Require Login"
            checked={isTruthy(
              changes?.env?.LOGIN_REQUIRED ??
                appInfo.env.LOGIN_REQUIRED ??
                "true"
            )}
            onChange={ev =>
              dispatch({
                type: "login_required",
                payload: ev.target.checked
              })
            }
          />
        </Card>
        Changes: {JSON.stringify(changes)}
      </div>
    );
  }
);
