/**
 * Remembers the school and username between visits.
 *
 * Deliberately does NOT store the password. A password in localStorage is
 * readable in plaintext by any script on the page and persists forever on a
 * shared device. The username/password inputs use the correct autocomplete
 * attributes so the browser's own password manager can fill them instead.
 */

const SCHOOL_KEY = "engage-next-school";
const USER_KEY = "engage-next-username";

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
  setSchool: (value: string) => write(SCHOOL_KEY, value),
  setUsername: (value: string) => write(USER_KEY, value),
  forget: () => {
    write(SCHOOL_KEY, "");
    write(USER_KEY, "");
  },
};
