import React from "react";
import "tailwindcss/dist/tailwind.css";

import { ListApps } from "./ListApps";
import { HerokuAuthWrapper } from "./auth";

const App: React.FC = () => {
  return (
    <div className="App">
      <h1>Deploy Netbox to Heroku</h1>
      <HerokuAuthWrapper>
        <ListApps />
      </HerokuAuthWrapper>
    </div>
  );
};

export default App;
