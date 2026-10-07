# Permalink Manager Pro removal runbook

The frontend uses a stable `canonical_path` supplied by Headless API. Headless API stores the canonical path and old alias in post meta, so public routes no longer depend on `get_permalink()` after the snapshot. Before a snapshot exists, the frontend falls back to `/{slug}-{post_id}` or `/en/{slug}-{post_id}`. Requests for article paths ending in an ID resolve by ID and redirect to the stored canonical path.

## Before staging or production deactivation

1. Back up the WordPress database and files.
2. Deploy Headless API 2.0.8 while Permalink Manager Pro is still active.
3. Run a dry run, then snapshot the existing public article paths while the current rewrite provider is active:

   ```sh
   wp headless-api snapshot-permalinks
   wp headless-api snapshot-permalinks --apply
   ```

4. Export the article redirects from the saved snapshot and preserve the original output:

   ```sh
   wp headless-api export-permalink-redirects --file=/tmp/tlu-article-redirects.json
   ```

5. Export any remaining Permalink Manager custom URI records and redirect/settings data. Normalize paths not covered by the Headless API article export into `university-next/src/data/legacy-permalink-redirects.json` with this shape:

   ```json
   {
     "/old-custom-path": "/new-canonical-path",
     "/en/old-english-path": "/en/new-english-path"
   }
   ```

6. Include every public custom path that is not already handled by the article ID resolver. Keep the mapping on the public frontend host (`tlu.edu.vn`), since CMS redirects alone do not serve headless frontend URLs.
7. Validate the normalized mapping from `university-next`:

   ```sh
   node scripts/validate-permalink-map.mjs src/data/legacy-permalink-redirects.json
   ```

8. Before deactivation, confirm all public posts have `_headless_public_path` and `_headless_legacy_path`, reconcile export counts, check for collisions/chains/wrong-language destinations, and check representative VI/EN posts, pages, categories, CPTs, and attachments on staging.
9. Deactivate Permalink Manager Pro only on a staging clone first. Verify old paths return a permanent redirect and new paths resolve. Monitor 404s and search-console coverage before production removal.

The checked-in map currently contains the three article aliases observed through the public REST API. The WP-CLI snapshot/export is authoritative and must replace or complete this map before deactivation. Do not deactivate the production plugin until the article snapshot and full route coverage have been verified; the CMS contains 9,065 published posts.
