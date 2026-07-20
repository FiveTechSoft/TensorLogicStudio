# TensorLogic Studio — agent notes

## Deployment (user preference)

The user **only tests on GitHub Pages**, not local Vite.

After any user-facing change that should be visible in the app:

1. Commit the relevant source changes (not debug screenshots unless asked).
2. **Push to `main`** so `.github/workflows/deploy-pages.yml` runs.
3. Wait for the Deploy GitHub Pages workflow to succeed when possible.
4. Tell the user the Pages URL and to hard-refresh (**Ctrl+F5**).

Live site: https://fivetechsoft.github.io/TensorLogicStudio/

Do **not** leave finished UI work only on the local machine without publishing.
