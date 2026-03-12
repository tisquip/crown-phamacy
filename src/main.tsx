import { createRoot } from "react-dom/client";
import "./index.css";
import "./googlestyles.css";
import { RouterProvider, createRouter } from "@tanstack/react-router";

// Import the generated route tree
import { routeTree } from "./routeTree.gen";
import { StrictMode } from "react";
import { ConvexReactClient } from "convex/react";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { constants } from "buffer";
import { environmentVariablesDefault } from "./lib/utils";

// Create a new router instance
const router = createRouter({ routeTree });
const convex = new ConvexReactClient(
  import.meta.env.VITE_CONVEX_URL ||
    environmentVariablesDefault.VITE_CONVEX_URL,
);
// Register the router instance for type safety
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

// Render the app
const rootElement = document.getElementById("root")!;
if (!rootElement.innerHTML) {
  const root = createRoot(rootElement);
  root.render(
    <StrictMode>
      <ConvexAuthProvider client={convex}>
        <RouterProvider router={router} />
      </ConvexAuthProvider>
    </StrictMode>,
  );
}
