# Deploys

**In one line:** Vercel publishes the web from `main` and builds a preview for each pull request. A GitHub workflow deploys the API as a Docker image to AWS Lightsail in Mumbai.

## What it is

To **deploy** is to put a new version of an app on the servers of the users. roomsie has two apps. Each app deploys in a different way.

- **The web** (`apps/web`) is on Vercel. Vercel watches the GitHub repo through its **Git link**. When a pull request opens, Vercel builds a **preview**: a copy of the site at its own address. When the pull request merges, Vercel publishes the new version to `roomsie.vercel.app`.
- **The API** (`apps/api`) is a **Docker image**: a sealed box with Node, our built code and the production libraries. AWS **Lightsail containers** runs the image on one small machine in Mumbai, all the time.

## How it fits our project

```
merge to main ─┬─▶ Vercel ──────────────▶ roomsie.vercel.app (bom1)
               └─▶ deploy-api workflow ─▶ build image ─▶ Lightsail (ap-south-1) ─▶ /v1/health check
```

| Item | Where |
|---|---|
| The web | Vercel, functions in `bom1` |
| The API | Lightsail service `roomsie-api`, Nano power (0.25 vCPU, 512 MB), `ap-south-1` |
| The database | Supabase, `ap-south-1` |
| The API secrets | GitHub secrets. The workflow gives them to each deployment. |

- The API and the database are in the same AWS region, so each query takes approximately 1 ms ([ADR-0009](../decisions/0009-hosting-and-region.md)).
- The workflow runs only when a merge changes the API, a package, the lockfile or the workflow. You can also start it by hand: GitHub → Actions → deploy-api → Run workflow.
- **CORS** is the browser rule that lets a page on one site call an API on a different site. The API allows only `https://roomsie.vercel.app`. Thus, a preview loads, but its calls to the API fail.
- Previews open only for members of the Vercel team. Vercel turns this protection on by default.

## The choice we made

- The web deploys through the Git link of Vercel, not a GitHub workflow. The link gives a free preview of each pull request. T-03 makes `main` accept a merge only when CI passes.
- The API was first on Fly.io in `bom`. Fly accepts no new machines in India, so the same image moved to Lightsail ([ADR-0009](../decisions/0009-hosting-and-region.md)).
- Lightsail has no secret store. Thus, the secrets are in the CI secret store ([ADR-0016](../decisions/0016-credentials-and-secrets.md)).
- Previews do not call the production API. The team examines this again after the launch. A staging API needs a third Supabase project, and the free plan allows two.

## Gotchas

- Add a new API secret in two places: `.env.deploy` and GitHub secrets. Then add its name to the Deploy step of the deploy workflow. If you do not, the API does not get it.
- The image builds from the repo root, because the API needs the workspace packages. The install skips scripts, because the root `prepare` script needs `git`.
- A deployment takes approximately 3 to 5 minutes. Lightsail keeps the previous version until the new version passes the health check.
- Lightsail shows the environment of each deployment in the AWS console. Only give AWS console access to people who can see the secrets.

## Tickets

- T-04: the first deploy of the web and the API.
