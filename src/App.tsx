import React from "react";
import "tailwindcss/dist/tailwind.css";

import { ListApps } from "./ListApps";
import { HerokuAuthWrapper } from "./auth";
import { Router, Redirect } from "@reach/router";

const App: React.FC = () => {
  return (
    <div className="App">
      <h1>Deploy Netbox to Heroku</h1>
      <HerokuAuthWrapper>
        <Router>
          <Redirect from="/" to="/apps" />
          <ListApps path="/apps" />
        </Router>
      </HerokuAuthWrapper>
    </div>
  );
};

export default App;
