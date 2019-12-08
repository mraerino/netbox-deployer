import React from "react";
import "tailwindcss/dist/tailwind.css";

import { ListApps } from "./ListApps";
import { HerokuAuthWrapper } from "./auth";
import { Router, Redirect } from "@reach/router";
import { HerokuClientWrapper } from "./heroku";
import { SetupPage } from "./Setup";

const App: React.FC = () => {
  return (
    <div className="App">
      <h1>Deploy Netbox to Heroku</h1>
      <HerokuAuthWrapper>
        <HerokuClientWrapper>
          <Router>
            <Redirect from="/" to="/apps" />
            <ListApps path="/apps" />
            <SetupPage path="/setup/:id" />
          </Router>
        </HerokuClientWrapper>
      </HerokuAuthWrapper>
    </div>
  );
};

export default App;
