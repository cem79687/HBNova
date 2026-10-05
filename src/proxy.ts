import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Pages accessibles sans être connecté.
const PUBLIC_PATHS = [
  "/login",
  "/forgot-password",
  "/auth/confirm",
  "/auth/callback",
];

// Pages qui doivent aussi fonctionner avec une session déjà ouverte.
const ALWAYS_ALLOWED = ["/forgot-password", "/auth/confirm", "/auth/callback"];

function isPath(pathname: string, path: string) {
  return pathname === path || pathname.startsWith(`${path}/`);
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
          Object.entries(headers).forEach(([key, value]) =>
            response.headers.set(key, value),
          );
        },
      },
    },
  );

  // getClaims() vérifie la signature du jeton : c'est la méthode à utiliser
  // pour protéger les pages (jamais getSession() côté serveur).
  const { data } = await supabase.auth.getClaims();
  const isLoggedIn = Boolean(data?.claims);
  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some((path) => isPath(pathname, path));

  if (!isLoggedIn) {
    return isPublic ? response : redirectTo(request, response, "/login");
  }

  if (ALWAYS_ALLOWED.some((path) => isPath(pathname, path))) {
    return response;
  }

  // Double authentification
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (!aal) {
    return new NextResponse("Erreur d'authentification. Rechargez la page.", {
      status: 500,
    });
  }

  if (aal.nextLevel === "aal1") {
    // Aucun appareil enregistré : l'activation est obligatoire.
    if (!isPath(pathname, "/securite")) {
      return redirectTo(request, response, "/securite");
    }
  } else if (aal.currentLevel !== "aal2") {
    // Appareil enregistré, mais code pas encore saisi pour cette session.
    if (!isPath(pathname, "/mfa")) {
      const next = pathname === "/login" ? "/" : pathname + request.nextUrl.search;
      return redirectTo(request, response, "/mfa", `?next=${encodeURIComponent(next)}`);
    }
  } else if (pathname === "/login" || isPath(pathname, "/mfa")) {
    return redirectTo(request, response, "/");
  }

  return response;
}

// Redirige en conservant les cookies de session déjà posés sur la réponse.
function redirectTo(
  request: NextRequest,
  response: NextResponse,
  path: string,
  search = "",
) {
  const url = request.nextUrl.clone();
  url.pathname = path;
  url.search = search;
  const redirect = NextResponse.redirect(url);
  response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  const cacheControl = response.headers.get("cache-control");
  if (cacheControl) redirect.headers.set("cache-control", cacheControl);
  return redirect;
}

export const config = {
  matcher: [
    // Toutes les pages, sauf fichiers internes de Next.js et images statiques.
    "/((?!_next/static|_next/image|favicon.ico|brand/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
