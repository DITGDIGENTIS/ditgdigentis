export interface RouteConfig {
  path: string;
  requireAuth: boolean;
  redirectTo?: string;
  authConfig?: AuthConfig;
}

export interface AuthConfig {
  password: string;
  secret: string;
  cookieName: string;
  loginType: string;
  cookieOptions?: CookieOptions;
}

export interface CookieOptions {
  path?: string;
  maxAge?: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: "strict" | "lax" | "none";
}
