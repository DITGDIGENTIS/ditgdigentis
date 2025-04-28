import { RouteConfig } from "@/types/routes";

// Если добавили новый маршрут, то нужно добавить его в ROUTES
export const ROUTES = {
  LOGIN: "/login",
  FURNISET: "/furniset",
  GREEN_HOUSE: "/green-house",
  TEST: "/test",
  HOME: "/",
} as const;

export function getPageTypeFromUrl(url: string): string | null {
  const loginRoutes = PUBLIC_ROUTES.filter((route) =>
    route.path.includes("login")
  );

  const loginRoute = loginRoutes.find((route) => url.includes(route.path));

  if (!loginRoute) return null;

  return loginRoute.path.split("-").pop() || null;
}

export function findProtectedRouteByPageType(pageType: string | null) {
  if (!pageType) return null;

  return PROTECTED_ROUTES.find((route) => {
    const normalizedRoutePath = route.path.replace(/-/g, "");
    const normalizedPageType = pageType.replace(/-/g, "");
    return normalizedRoutePath.includes(normalizedPageType);
  });
}

// Если добавили новый маршрут защищенный паролем, то нужно добавить его в PROTECTED_ROUTES
export const PROTECTED_ROUTES: RouteConfig[] = [
  {
    path: ROUTES.FURNISET,
    requireAuth: true,
    redirectTo: ROUTES.LOGIN,
    authConfig: {
      password: "123",
      secret: "furniset_secret_key",
      cookieName: "furniset_auth",
      loginType: "furniset",
      cookieOptions: {
        path: "/",
        maxAge: 60 * 60 * 24,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
      },
    },
  },
  {
    path: ROUTES.GREEN_HOUSE,
    requireAuth: true,
    redirectTo: ROUTES.LOGIN,
    authConfig: {
      password: "12345",
      secret: "greenhouse_secret_key",
      cookieName: "greenhouse_auth",
      loginType: "green-house",
      cookieOptions: {
        path: "/",
        maxAge: 60 * 60 * 24,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
      },
    },
  },
  {
    path: ROUTES.TEST,
    requireAuth: true,
    redirectTo: ROUTES.LOGIN,
    authConfig: {
      password: "test",
      secret: "test_secret_key",
      cookieName: "test_auth",
      loginType: "test",
      cookieOptions: {
        path: "/",
        maxAge: 60 * 60 * 24,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
      },
    },
  },
];

// Если добавили новый маршрут публичный, то нужно добавить его в PUBLIC_ROUTES
export const PUBLIC_ROUTES: RouteConfig[] = [
  {
    path: ROUTES.LOGIN,
    requireAuth: false,
  },
  {
    path: ROUTES.HOME,
    requireAuth: false,
  },
];
