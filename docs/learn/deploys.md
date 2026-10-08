# Deploys

**In one line:** Vercel publishes the web from `main` and builds a preview for each pull request. A GitHub workflow deploys the API as a Docker image to AWS Lightsail in Mumbai.

## What it is

To **deploy** is to put a new version of an app on the servers of the users. roomsie has two apps. Each app deploys in a different way.

- **The web** (`apps/web`) is on Vercel. Vercel watches the GitHub repo through its **Git link**. When a pull request opens, Vercel builds a **preview**: a copy of the site at its own address. When the pull request merges, Vercel publishes the new version to `roomsie.in`.
- **The API** (`apps/api`) is a **Docker image**: a sealed box with Node, our built code and the production libraries. AWS **Lightsail containers** runs the image on one small machine in Mumbai, all the time.

## How it fits our project

```
merge to main ─┬─▶ Vercel ──────────────▶ roomsie.in (bom1)
               └─▶ deploy-api workflow ─▶ build image ─▶ Lightsail (ap-south-1) ─▶ api.roomsie.in
```

| Item | Where |
|---|---|
| The web | Vercel, functions in `bom1`, at `roomsie.in` |
| The API | Lightsail service `roomsie-api`, Nano power (0.25 vCPU, 512 MB), `ap-south-1`, at `api.roomsie.in` |
| The database | Supabase, `ap-south-1` |
| The DNS of roomsie.in | Cloudflare. GoDaddy keeps the registration. |
| The API secrets | GitHub secrets. The workflow gives them to each deployment. |

- The API and the database are in the same AWS region, so each query takes approximately 1 ms ([ADR-0009](../decisions/0009-hosting-and-region.md)).
- The workflow runs only when a merge changes the API, a package, the lockfile or the workflow. You can also start it by hand: GitHub → Actions → deploy-api → Run workflow.
- **CORS** is the browser rule that lets a page on one site call an API on a different site. The API allows only `https://roomsie.in`. Thus, a preview loads, but its calls to the API fail.
- Previews open only for members of the Vercel team. Vercel turns this protection on by default.
- `www.roomsie.in` and `roomsie.vercel.app` redirect to `roomsie.in`. Thus, a browser uses one address for the site and for the login.
- **DNS** tells a browser which server has a name. Each record in Cloudflare is "DNS only". The browser connects to Vercel or Lightsail directly.

## The choice we made

- The web deploys through the Git link of Vercel, not a GitHub workflow. The link gives a free preview of each pull request. T-03 makes `main` accept a merge only when CI passes.
- The API was first on Fly.io in `bom`. Fly accepts no new machines in India, so the same image moved to Lightsail ([ADR-0009](../decisions/0009-hosting-and-region.md)).
- Lightsail has no secret store. Thus, the secrets are in the CI secret store ([ADR-0016](../decisions/0016-credentials-and-secrets.md)).
- The DNS is on Cloudflare, and GoDaddy keeps the registration ([ADR-0009](../decisions/0009-hosting-and-region.md)).
- Previews do not call the production API. The team examines this again after the launch. A staging API needs a third Supabase project, and the free plan allows two.

## Gotchas

- A new domain cannot move to a different registrar for 60 days after the purchase. You can change its name servers immediately.
- GoDaddy can put a new domain on "Registrar Hold" (`clientHold`). Then the domain does not work, and no setting can change. Only GoDaddy support can remove the hold.
- Add a new API secret to `.env.deploy`, to GitHub secrets, and with a dummy value to `apps/api/.env.example`. Then add it to the Deploy step of the deploy workflow, with the prefix `API_`. If you do not, the API does not get it.
- The image builds from the repo root, because the API needs the workspace packages. The install skips scripts, because the root `prepare` script needs `git`.
- A deployment takes approximately 3 to 5 minutes. Lightsail keeps the previous version until the new version passes the health check.
- Lightsail shows the environment of each deployment in the AWS console. Only give AWS console access to people who can see the secrets.

## Tickets

- T-04: [#110](https://github.com/magentawood/roomsie/pull/110), 2026-10-06. The first deploy of the web and the API, and the move from Fly to Lightsail.
