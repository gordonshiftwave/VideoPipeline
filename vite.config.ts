import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { build } from "esbuild"
import type { IncomingMessage, ServerResponse } from "node:http"
import path from "node:path"
import { pathToFileURL, fileURLToPath } from "node:url"
import { defineConfig, loadEnv, type Plugin, type PreviewServer, type ViteDevServer } from "vite"

const root = path.dirname(fileURLToPath(import.meta.url))

/** GitHub Pages project site: https://gordonshiftwave.github.io/VideoPipeline/ */
const PAGES_BASE = "/VideoPipeline/"

const ENV_KEYS = ["AIRTABLE_PAT", "AIRTABLE_API_KEY", "AIRTABLE_BASE_ID", "AIRTABLE_TABLE_ID"] as const

function normalizeBase(value: string | undefined): string {
  const trimmed = value?.trim() ?? ""
  if (!trimmed) return ""
  if (trimmed === "./") return "./"
  return trimmed.endsWith("/") ? trimmed : `${trimmed}/`
}

function applyAirtableEnv(mode: string) {
  const env = loadEnv(mode, root, "")
  for (const key of ENV_KEYS) {
    if (env[key]) process.env[key] = env[key]
  }
}

type Handler = {
  handleProjectsRequest: (
    method: string,
    rawBody: string | null,
  ) => Promise<{ status: number; json: unknown }>
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on("data", (chunk) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    })
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")))
    req.on("error", reject)
  })
}

async function serveApi(
  req: IncomingMessage,
  res: ServerResponse,
  load: () => Promise<Handler>,
): Promise<boolean> {
  const url = (req.url ?? "").split("?")[0]
  if (url !== "/api/projects") return false
  try {
    const mod = await load()
    const method = req.method ?? "GET"
    const raw = method === "GET" || method === "HEAD" ? null : await readBody(req)
    const result = await mod.handleProjectsRequest(method, raw)
    res.statusCode = result.status
    res.setHeader("Content-Type", "application/json; charset=utf-8")
    res.setHeader("Cache-Control", "no-store")
    res.end(JSON.stringify(result.json))
  } catch (error) {
    const message = error instanceof Error ? error.message : "Request failed"
    res.statusCode = 500
    res.setHeader("Content-Type", "application/json; charset=utf-8")
    res.end(JSON.stringify({ ok: false, message }))
  }
  return true
}

let previewBundle: Promise<Handler> | null = null

function loadPreviewHandler(): Promise<Handler> {
  previewBundle ??= (async () => {
    const outfile = path.join(root, "node_modules/.video-pipeline-api.mjs")
    await build({
      entryPoints: [path.join(root, "src/server/http.ts")],
      bundle: true,
      platform: "node",
      format: "esm",
      outfile,
      alias: { "@": path.join(root, "src") },
      logLevel: "silent",
    })
    return import(`${pathToFileURL(outfile).href}?t=${Date.now()}`) as Promise<Handler>
  })()
  return previewBundle
}

function projectsApi(): Plugin {
  return {
    name: "projects-api",
    config(_config, { mode }) {
      applyAirtableEnv(mode)
    },
    configureServer(server: ViteDevServer) {
      server.middlewares.use(async (req, res, next) => {
        const handled = await serveApi(req, res, () => server.ssrLoadModule("/src/server/http.ts") as Promise<Handler>)
        if (!handled) next()
      })
    },
    configurePreviewServer(server: PreviewServer) {
      server.middlewares.use(async (req, res, next) => {
        const handled = await serveApi(req, res, loadPreviewHandler)
        if (!handled) next()
      })
    },
  }
}

export default defineConfig(({ command, isPreview, mode }) => {
  const env = loadEnv(mode, root, "VITE_")
  const fromEnv = normalizeBase(env.VITE_BASE)
  // `npm run dev` stays at http://127.0.0.1:3847/. Production and preview
  // default to the Pages path. Override with VITE_BASE.
  const base = fromEnv || (command === "serve" && !isPreview ? "/" : PAGES_BASE)

  return {
    base,
    plugins: [react(), tailwindcss(), projectsApi()],
    resolve: {
      alias: { "@": path.join(root, "src") },
    },
    server: {
      host: true,
      port: 3847,
      strictPort: true,
    },
    preview: {
      host: true,
      port: 3847,
      strictPort: true,
    },
  }
})
