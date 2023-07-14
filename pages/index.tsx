import React from "react";
import { Providers } from "../components/Providers";
import { App } from "./App"; // Ensure your App component is inside components or similar directory.

export default function HomePage() {
  return (
    <Providers>
      <App />
    </Providers>
  );
}
