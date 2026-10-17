/** Keep protected access entry local; never proxy its browser POST to Render. */
export function frontendRoutes({ apiOrigin, environment, acceptanceApproved, bootstrap = false }) {
  if (bootstrap) return [{ src: "^/(.*)$", dest: "/frontend" }];
  const localEntry = environment === "staging" ||
    (environment === "production" && acceptanceApproved === "true");
  return [
    { src: "^/__qx_access/enter$", dest: localEntry ? "/frontend" : `${apiOrigin}/api/__qx_access/enter` },
    { src: "^/api(?:/(.*))?$", dest: `${apiOrigin}/api/$1` },
    { src: "^/(.*)$", dest: "/frontend" },
  ];
}
