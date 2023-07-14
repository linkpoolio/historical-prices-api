import React from "react";
import { Providers } from "../components/providers";
import App from "./app";

function HomePage() {
  return (
    <Providers>
      <App />
    </Providers>
  );
}

export default HomePage;
