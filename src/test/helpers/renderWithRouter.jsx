import { render } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";

/**
 * Render a component inside a memory router at a given path.
 * Use when the component needs routing context (useNavigate, Link, etc.)
 *
 * @param {React.ReactElement} ui
 * @param {{ path?: string, initialPath?: string }} options
 */
export function renderWithRouter(ui, { path = "/", initialPath = "/" } = {}) {
  const router = createMemoryRouter(
    [{ path, element: ui }],
    { initialEntries: [initialPath] }
  );
  return render(<RouterProvider router={router} />);
}
