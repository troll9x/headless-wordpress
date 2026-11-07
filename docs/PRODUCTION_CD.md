# Production frontend CD

The workflow in `.github/workflows/cd-production.yml` deploys **only the Next.js frontend service**. It does not install the WordPress plugin, migrate or restart MySQL, change Nginx/Cloudflare/DNS, or redirect `tlu.edu.vn`. The current release decision remains NO-GO until the staging and infrastructure gates pass.

## GitHub configuration

The `production` environment has been created in `troll9x/headless-wordpress` with `troll9x` as required reviewer and a `main`-only deployment policy. Its protection settings are recorded in `.github/production-environment.json`. No target variables or SSH secrets have been set. Set these **environment variables** to the verified production frontend host, not the school CMS host:

| Variable | Meaning |
| --- | --- |
| `PROD_SSH_HOST` | DNS name or IP of the production Next.js host |
| `PROD_SSH_PORT` | SSH port |
| `PROD_SSH_USER` | Dedicated deploy user |
| `PROD_APP_DIR` | Absolute release root, such as `/srv/tlu-frontend` |
| `PROD_SYSTEMD_SERVICE` | Exact production frontend systemd unit name |
| `PROD_HEALTH_URL` | Loopback origin URL, such as `http://127.0.0.1:3000/` |

Set these **environment secrets**: `PROD_SSH_PRIVATE_KEY` (dedicated deploy key) and `PROD_SSH_KNOWN_HOSTS` (pinned host key verified through a separate trusted channel). Do not obtain trust by running `ssh-keyscan` in the workflow.

## Host prerequisites

Before the first run, an operator must provision the production frontend host with Node/npm, Git, curl, and a dedicated deploy user. The deploy user needs write access to `PROD_APP_DIR` and narrowly scoped passwordless `sudo` access to `systemctl show/is-active/restart` for **only** `PROD_SYSTEMD_SERVICE`. The host must be able to read the public GitHub repo. The service's `WorkingDirectory` must equal `PROD_APP_DIR/current`; the current symlink must already point to a known-good `PROD_APP_DIR/releases/<sha>/university-next`. This first baseline release and the Nginx route must be prepared and reviewed separately.

Keep the production runtime settings in `PROD_APP_DIR/shared/.env.production.local`, readable by the deploy user. In particular, verify `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_WP_BASE_URL`, `WP_API_URL`, `WP_SITE_URL`, `LEGACY_WP_SITE_URL`, search/revalidation secrets and TTS settings. The workflow copies this file into the new isolated release with mode 600 before building. Do not commit it.

## Run and recovery

1. Resolve the current NO-GO findings and merge the exact staging-tested commit to `main`. Staging must return `X-TLU-Release` matching that commit. The workflow reruns CI and browser tests against staging.
2. In GitHub Actions, start **CD production frontend** on `main`; enter its full 40-character commit SHA and `DEPLOY tlu.edu.vn`. The production environment reviewer must approve the deploy job after the gates pass.
3. The remote script clones that SHA to an isolated release, installs locked dependencies, builds with production settings, switches the `current` symlink, restarts only the configured frontend service, and checks the loopback `X-TLU-Release`. If restart or health checking fails, it restores the prior symlink and restarts the service. It retains both releases for investigation.
4. After a successful service deployment, an operator separately verifies the public route, content, search, media, SEO, CMS/admin access and monitoring. Switching public routing from WordPress to Next.js requires its own reviewed procedure and rollback plan from `DEPLOYMENT_AND_ROLLBACK.md`.

The workflow intentionally fails if any target setting, pinned SSH host key, baseline release, exact staging SHA, CI result or staging browser test is missing. A successful workflow does not by itself authorize a public routing change.
