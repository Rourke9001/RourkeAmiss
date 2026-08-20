# Deployment

Everything here except the resource creation is already done and committed. This
document is the runbook for the parts that need an Azure subscription and a
person at a keyboard.

**Nothing in this repository contains a secret, and nothing should ever be added
that does.** Both ACS values live only as Static Web Apps application settings.

## Before you start

- `rourkeamiss.co.za` is not registered yet. Nothing in the build depends on it:
  every CSP source is `'self'`, so the site works on the generated
  `*.azurestaticapps.net` hostname and keeps working when the domain is added.
- Local Node is 24, which the Azure Functions Core Tools refuse. To run the API
  locally, install Node 22 and point the worker at it in `api/local.settings.json`
  (gitignored):
  ```json
  { "Values": { "languageWorkers__node__defaultExecutablePath": "C:/path/to/node22/node.exe" } }
  ```

## 1. Resource group and the Static Web App

```bash
az group create --name rg-rourkeamiss-site --location westeurope

az staticwebapp create \
  --name swa-rourkeamiss \
  --resource-group rg-rourkeamiss-site \
  --location westeurope \
  --sku Free
```

**`--sku Free` is not optional.** On Free, overage bandwidth is `Unavailable`
rather than billable, which is what makes a surprise bill structurally
impossible. Never upgrade to Standard to "unblock" something — every constraint
in this project was chosen to fit inside Free.

Both flags above were verified against `az staticwebapp create --help` on Azure
CLI 2.88.0.

## 2. Email, via an Azure Managed Domain

In the portal, because there is no clean CLI path:

1. Create an **Email Communication Service**.
2. Add an **Azure Managed Domain**. One click; it provisions
   `donotreply@<guid>.azurecomm.net` with SPF and DKIM already configured, so
   there is no DNS work and this does not wait on the custom domain.
3. Create a **Communication Service** and connect the verified domain to it.
4. Copy the connection string.

The managed domain is deliberate: the alternative is verifying a custom sending
domain, which cannot happen before `rourkeamiss.co.za` exists.

## 3. Application settings

```bash
az staticwebapp appsettings set \
  --name swa-rourkeamiss \
  --resource-group rg-rourkeamiss-site \
  --setting-names \
    ACS_CONNECTION_STRING="<connection string>" \
    ACS_SENDER_ADDRESS="donotreply@<guid>.azurecomm.net"
```

These two names are the entire configuration surface. `api/src/email.ts` reads
them at call time and throws `ACS is not configured` before constructing a
client if either is missing, which the Function turns into a 502 carrying no
detail about why. That is the current, verified behaviour of the deployed code
until these are set — the form will accept input and answer "could not deliver".

**To rotate the connection string:** regenerate the key in the Communication
Service resource, run the command above again with the new value, and the next
invocation picks it up. There is nothing to redeploy and nothing in git to change.

## 4. Budget alert

Static Web Apps on Free cannot bill. This exists to catch Communication
Services, which is the only metered resource in the architecture.

```bash
az consumption budget create \
  --budget-name budget-rourkeamiss \
  --amount 5 \
  --category cost \
  --time-grain monthly \
  --start-date 2026-09-01 \
  --end-date 2027-09-01 \
  --resource-group rg-rourkeamiss-site
```

Note that `--start-date` and `--end-date` are **required**, and `--category`
and `--time-grain` take lowercase values — a form omitting them fails. Checked
against `az consumption budget create --help` on CLI 2.88.0, where the
`consumption` command group still reports itself as in preview — if it has moved
on, the portal's Cost Management → Budgets does the same job. Add an alert at 80%.

## 5. Deployment token

Copy the deployment token from the Static Web App (portal → Overview → Manage
deployment token) and add it to the repository as the secret
**`AZURE_STATIC_WEB_APPS_API_TOKEN`**:

```bash
gh secret set AZURE_STATIC_WEB_APPS_API_TOKEN --repo Rourke9001/RourkeAmiss
```

`.github/workflows/azure-static-web-apps.yml` is already committed. It is not
dormant before the secret exists: it also triggers on pull requests targeting
`main`, where the deploy step fails with `deployment_token was not provided`
once the build and both guards have passed. That red X is expected until this
step is done. `verify` in `ci.yml` is the check that carries the signal.

## 6. Deploy

Merge `feat/site-foundation` into `main` and push. The deploy workflow builds
the site with Oryx (`app_location: /`, `api_location: api`, `output_location:
dist`) and publishes. Confirm the site loads on the generated
`*.azurestaticapps.net` hostname.

Then check the things that could not be verified locally:

- **The form, end to end.** Submit it and confirm the email lands in the inbox
  and that replying addresses the requester rather than `donotreply@`.

- **The rate-limit key is per-caller, and is not everybody.** `clientKey` in
  `api/src/rateLimit.ts` prefers `x-azure-clientip` and otherwise takes the
  last `x-forwarded-for` hop with the port stripped. Which hop is correct
  depends on how many proxies append in front of the Function, and that cannot
  be established anywhere but a real deployment. Both ways of being wrong are
  quiet:
  - If the key still varies per request, the limit never fires. Submit six
    times in an hour; the sixth must answer 429.
  - If the key is a fixed internal Azure address, *every* visitor shares one
    bucket and five submissions lock the site's only contact path for an hour.
    Check from a second network — a phone off wifi is enough — that it is not
    already limited.

  Log the resolved key once while checking, then remove the log. If neither
  header yields an address the code falls back to a single shared bucket, which
  is the second failure above.
- **`GET /api/request-cv` should answer 405.** Locally the emulator proxies to
  the Functions host, which answers 404 for an unregistered method before the
  route rule is consulted, so the rule in `staticwebapp.config.json` is
  unverified. Both are refusals, so this is a tidiness check, not a security one.
- **`POST /api/request-cv` must still work**, which is the thing to actually
  watch. POST is deliberately absent from the 405 rule so it always reaches the
  Functions host. The tempting tidier config — allow POST on the one route,
  refuse every method on `/api/*` — depends on how Static Web Apps orders a rule
  that matches but carries no action, and that could not be verified locally. If
  it fell through, the form would 405 in production. POST to any other `/api`
  path answers 404 from the Functions host, which registers exactly one route.

## 7. Protect main

Only after the `verify` check has run at least once — naming a check that has
never reported blocks every merge:

```bash
gh api -X PUT repos/Rourke9001/RourkeAmiss/branches/main/protection \
  --input - <<'JSON'
{
  "required_status_checks": { "strict": true, "contexts": ["verify"] },
  "enforce_admins": false,
  "required_pull_request_reviews": null,
  "restrictions": null,
  "allow_force_pushes": false
}
JSON
```

## 8. Custom domain, once rourkeamiss.co.za is registered

The Free plan allows exactly two custom domains, and the plan is apex plus
`www` — so that budget is fully spent and there is no third.

1. `az staticwebapp hostname set --name swa-rourkeamiss --resource-group rg-rourkeamiss-site --hostname www.rourkeamiss.co.za` and add the CNAME it asks for.
2. For the apex, use the ALIAS/ANAME record type if the registrar supports it,
   or the TXT validation flow Azure offers.

**Then finish the job:** set `SITE_LIVE = true` in `scripts/generate-readme.ts`
and run `npm run readme:publish`. Until that happens the GitHub profile README
names the site in plain text instead of linking it, because a dead link on a
profile is worse than no link. **The deployment is not complete until this is
done.**

## What runs where

| Thing | Where it lives |
| --- | --- |
| Site build | Oryx, from `app_location: /` to `dist` |
| API | Azure Functions, `node:22`, from `api/` |
| ACS connection string | Static Web Apps application setting, never in git |
| ACS sender address | Static Web Apps application setting, never in git |
| Deployment token | GitHub repository secret |
| CV file | Nowhere. There is no download; the form emails a request |
