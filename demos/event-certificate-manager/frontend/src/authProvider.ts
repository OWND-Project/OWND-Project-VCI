import { AuthProvider, HttpError } from "react-admin";

interface AuthenticationContext {
  status: number;
}

const apiUrl = process.env.VITE_API_URL != null ? process.env.VITE_API_URL : "";
/**
 * This authProvider is only for test purposes. Don't use it in production.
 */
export const authProvider: AuthProvider = {
  login: async ({ username, password }) => {
    const request = new Request(`${apiUrl}/login`, {
      method: "POST",
      body: JSON.stringify({ username, password }),
      headers: new Headers({
        "Content-Type": "application/json",
      }),
      // for session
      credentials: "include",
    });

    try {
      const response = await fetch(request);
      if (!response.ok) {
        throw new Error(`POST response is not OK: ${response.status}`);
      }

      localStorage.setItem("authenticated", "true");
      return response;
    } catch (e) {
      throw new HttpError("Unauthorized", 401, {
        message: "Invalid username or password",
      });
    }
  },
  logout: () => {
    localStorage.removeItem("authenticated");
    return Promise.resolve();
  },
  checkError: (error: AuthenticationContext) => {
    const { status } = error;
    console.log(error);
    if (status === 401 || status === 403) {
      localStorage.removeItem("authenticated");
      return Promise.reject();
    }
    return Promise.resolve();
  },
  checkAuth: () =>
    localStorage.getItem("authenticated")
      ? Promise.resolve()
      : Promise.reject(),
  getPermissions: () => {
    return Promise.resolve(undefined);
  },
  // getIdentity: () => {
  //   const persistedUser = localStorage.getItem("user");
  //   const user = persistedUser ? JSON.parse(persistedUser) : null;
  //
  //   return Promise.resolve(user);
  // },
};

export default authProvider;
