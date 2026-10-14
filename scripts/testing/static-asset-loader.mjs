/** Node's test runner has no Vite asset pipeline; expose local assets as URL strings. */
export async function load(url, context, nextLoad) {
  if (/\.(?:png|jpe?g|svg|webp|woff2?)(?:\?.*)?$/.test(url))
    return { format: "module", shortCircuit: true,
      source: `export default ${JSON.stringify(new URL(url).pathname)};` };
  return nextLoad(url, context);
}
