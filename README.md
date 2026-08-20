# rourkeamiss.co.za

The source for Rourke Amiss's personal site: an Astro static site, plus one Azure
Function that backs the "request my CV" form. Deployed to Azure Static Web Apps.

The CV is not published here as a file. `/api/request-cv` emails the request and
it gets answered with a copy tailored to the role — which is why there is no PDF
in this repository and why `.gitignore` refuses to accept one.

## Requirements

| | |
| --- | --- |
| Node | 22 or newer for the site. The API needs **exactly** Node 22 — see below |
| npm | 9 or newer |
| Azure Functions Core Tools v4 | Only to run the API locally |

## Start the site

```sh
npm install
npm run dev
```

That serves the site on <http://localhost:4321>. It is the whole site — every
page, every style, the React islands — with one exception: the request-CV form
will fail to submit, because nothing is listening on `/api`. If you are working
on anything other than that form, this is all you need.

To run it detached instead, so it survives between commands:

```sh
npx astro dev --background   # then: astro dev status | astro dev logs | astro dev stop
```

## Start the API as well

The API is a separate npm package under `api/`, with its own dependencies and
its own build. It is not covered by the root `npm install`.

```sh
npm install --prefix api
npm run build --prefix api    # tsc; func serves the emitted JS, not the TS
cd api && func start          # http://localhost:7071/api/request-cv
```

Run that alongside `npm run dev` and point the form at port 7071, or put the SWA
emulator in front of both (see the caveat below) to get the production `/api`
path.

### The Node 22 constraint

Azure Functions Core Tools v4 refuses to run on Node 24, and Static Web Apps
pins the API to `node:22` anyway (`public/staticwebapp.config.json`). If your
machine is on Node 24, install Node 22 and point the Functions worker at it in
`api/local.settings.json`, which is gitignored and must be created by hand:

```json
{
  "IsEncrypted": false,
  "Values": {
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "AzureWebJobsStorage": "",
    "languageWorkers__node__defaultExecutablePath": "C:/absolute/path/to/node22/node.exe"
  }
}
```

That path is machine-local and absolute; it will not match anyone else's box.

**`swa start` does not work around this.** The SWA emulator checks the Node
version it is itself running under, before `local.settings.json` is ever read,
and exits with *"Found Azure Functions Core Tools v4 which is incompatible with
your current Node.js"*. The override only satisfies `func start`. To use the
emulator, run the whole shell under Node 22.

### What the API does without credentials

`ACS_CONNECTION_STRING` and `ACS_SENDER_ADDRESS` are Static Web Apps application
settings and exist nowhere in this repository. Without them the endpoint still
runs and still validates — it just cannot deliver:

| Request | Answer |
| --- | --- |
| Malformed JSON, or a failed field validation | `400` with the field errors |
| Honeypot field populated | `202` — indistinguishable from success, by design |
| Valid request, ACS not configured | `502` "Could not deliver the request" |

So a local `502` on a valid submission is the expected result, not a broken
setup. Everything up to the send is exercised.

## Commands

All run from the repository root.

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server on `localhost:4321` |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Serve `dist/` as it will be served in production |
| `npx astro check` | Type-check `.astro`, `.ts` and `.tsx` |
| `npm test` | Unit and component tests (vitest, single run) |
| `npm run test:watch` | The same suite, in watch mode |
| `npm run test:e2e` | Playwright end-to-end and accessibility; starts and stops `preview` itself |
| `npm run check:forbidden` | Scans `dist/` for never-publish patterns — **needs a build first** |
| `npm run check:csp` | Verifies every inline script and style in `dist/` is CSP-hashed — **needs a build first** |

`check:forbidden` and `check:csp` read the built output, so `npm run build`
has to have run or they will fail on a missing or stale `dist/`.

To reproduce CI locally, in order:

```sh
npm ci && npm ci --prefix api
npx astro check
npm test
npm run build
npm run check:forbidden
npm run check:csp
npm run test:e2e
```

### The two README commands are not about this file

`npm run readme` and `npm run readme:publish` generate **`profile/README.md`**
from the typed CV in `src/content/cv/cv.ts`, and publish it to the
`Rourke9001/Rourke9001` GitHub profile repository. They do not touch this file.
Publishing is deliberately manual — see the comment in
`scripts/publish-readme.ts`.

## Layout

```text
src/
  content/cv/cv.ts     the typed CV — the single source for the site, the
                       /cv page and the generated profile README
  content/work/        case studies (.mdx). `draft: true` keeps one out of
                       the build entirely, not merely unlinked
  components/          Astro components, plus two React islands
  pages/               routes: /, /cv, /work, /work/[slug], /404
  styles/              tokens, base, print
api/                   Azure Function for the request-CV form (own package)
scripts/               build guards and the profile-README generator
tests/unit/            vitest
tests/e2e/             playwright, including axe accessibility checks
docs/                  design direction and the deployment runbook
```

Only case studies with `draft: false` are routed. Two of the three are currently
drafts, so `/work` lists one and the other two 404 by design.

## Deploying

`docs/deployment.md` is the runbook — Azure resources, the two application
settings, the budget alert, the custom domain, and the checks that can only be
made against a real deployment. Nothing in this repository holds a secret, and
nothing should ever be added that does.
