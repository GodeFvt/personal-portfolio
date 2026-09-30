declare module "#auth-utils" {
  interface User {
    id: string;
    email: string;
  }

  interface SecureSessionData {
    sessionId: string;
    sessionVersion: number;
  }

  interface UserSession {
    csrfToken?: string;
    loggedInAt?: number;
  }
}

export {};
