import { NextRequest, NextResponse } from "next/server";
import {
  PROTECTED_ROUTES,
  PUBLIC_ROUTES,
  getPageTypeFromUrl,
  findProtectedRouteByPageType,
} from "@/config/routes";
import { createHash } from "@/lib/crypto";

export async function middleware(request: NextRequest) {
  const currentPath = request.nextUrl.pathname;

  console.log("Middleware check:", { currentPath });

  const protectedRoute = PROTECTED_ROUTES.find((route) => {
    const normalizedRoutePath = route.path.replace(/-/g, "");
    const normalizedCurrentPath = currentPath.replace(/-/g, "");
    const isProtected = normalizedCurrentPath.startsWith(normalizedRoutePath);

    console.log("Route check:", {
      route: route.path,
      normalizedRoutePath,
      normalizedCurrentPath,
      isProtected,
    });

    return isProtected;
  });

  console.log("Found protected route:", protectedRoute);

  const publicRoute = PUBLIC_ROUTES.find((route) =>
    currentPath.startsWith(route.path)
  );

  if (currentPath === "/login" || currentPath === "/") {
    console.log("Clearing auth cookies for login or home page");
    const response = NextResponse.next();

    PROTECTED_ROUTES.forEach((route) => {
      if (route.authConfig?.cookieName) {
        response.cookies.delete(route.authConfig.cookieName);
        console.log(`Deleted cookie: ${route.authConfig.cookieName}`);
      }
    });

    return response;
  }

  if (protectedRoute?.authConfig) {
    const { cookieName, secret, password } = protectedRoute.authConfig;
    const authCookie = request.cookies.get(cookieName);
    const expectedHash = await createHash(password, secret);
    const isAuth = authCookie?.value === expectedHash;

    console.log("Auth check:", {
      path: currentPath,
      route: protectedRoute.path,
      cookieName,
      hasCookie: !!authCookie,
      isAuth,
      cookieValue: authCookie?.value,
      expectedHash,
    });

    if (!isAuth) {
      console.log("Redirecting to login:", {
        redirectTo: protectedRoute.redirectTo,
        currentPath,
      });

      const redirectUrl = new URL(
        protectedRoute.redirectTo || "/",
        request.url
      );
      redirectUrl.searchParams.set("redirect", currentPath);
      return NextResponse.redirect(redirectUrl);
    }
  }

  if (publicRoute && currentPath.includes("login")) {
    const loginType = getPageTypeFromUrl(currentPath);
    const protectedRoute = findProtectedRouteByPageType(loginType);

    if (protectedRoute?.authConfig) {
      const { cookieName, secret, password } = protectedRoute.authConfig;
      const authCookie = request.cookies.get(cookieName);
      const expectedHash = await createHash(password, secret);
      const isAuth = authCookie?.value === expectedHash;

      if (isAuth) {
        return NextResponse.redirect(new URL(protectedRoute.path, request.url));
      }
    }
  }

  return NextResponse.next();
}

// Определяем конфигурацию для middleware
// Если добавили новую защищенную паролем страницу, то нужно добавить ее в matcher
export const config = {
  matcher: ["/furniset/:path*", "/green-house/:path*", "/login", "/", "/test/:path*"],
};
