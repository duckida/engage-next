/**
 * Remembers the school, username and password in this browser only.
 *
 * The password is stored in localStorage so the app can quietly sign back in
 * when the server session expires. It never leaves this device: the server
 * only receives it on the login request and keeps it out of the session cookie.
 */

const SCHOOL_KEY = "engage-next-school";
const USER_KEY = "engage-next-username";
const PASSWORD_KEY = "engage-next-password";

function read(key: string): string {
  try {
    return localStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
}

function write(key: string, value: string) {
  try {
    if (value) localStorage.setItem(key, value);
    else localStorage.removeItem(key);
  } catch {
    /* private mode or storage disabled — not worth failing over */
  }
}

export const remembered = {
  school: () => read(SCHOOL_KEY),
  username: () => read(USER_KEY),
  password: () => read(PASSWORD_KEY),
  setSchool: (value: string) => write(SCHOOL_KEY, value),
  setUsername: (value: string) => write(USER_KEY, value),
  setPassword: (value: string) => write(PASSWORD_KEY, value),
  /** Keep the school and username, but drop the saved password (used on sign out). */
  clearPassword: () => write(PASSWORD_KEY, ""),
  forget: () => {
    write(SCHOOL_KEY, "");
    write(USER_KEY, "");
    write(PASSWORD_KEY, "");
  },
};
