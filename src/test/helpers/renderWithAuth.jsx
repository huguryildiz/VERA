import { render } from "@testing-library/react";
import { createContext } from "react";
import { MemoryRouter } from "react-router-dom";

// Re-export AuthContext so tests can reference it without importing from source
export const AuthContext = createContext(null);

const DEFAULT_USER = {
  id: "user-001",
  email: "admin@test.edu",
  full_name: "Test Admin",
};

const DEFAULT_MEMBERSHIP = {
  organization_id: "org-001",
  organization_name: "Test University",
  role: "admin",
};

/**
 * Render a component with a mocked AuthContext and MemoryRouter.
 *
 * @param {React.ReactElement} ui
 * @param {{ user?: object, membership?: object, initialPath?: string }} options
 */
export function renderWithAuth(ui, { user, membership, initialPath = "/" } = {}) {
  const authValue = {
    user: user ?? DEFAULT_USER,
    membership: membership ?? DEFAULT_MEMBERSHIP,
    isLoading: false,
    signOut: vi.fn(),
  };

  return render(
    <AuthContext.Provider value={authValue}>
      <MemoryRouter initialEntries={[initialPath]}>{ui}</MemoryRouter>
    </AuthContext.Provider>
  );
}
