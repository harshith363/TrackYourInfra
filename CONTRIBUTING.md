# Contributing to TrackYourInfra

Use the [GitHub Issue Forms](https://github.com/harshith363/TrackYourInfra/issues/new/choose) to add a metro project, update a fact, add a source, or draw a route. You do not need to edit code or open a pull request. Submit one focused change with a public source URL and a short explanation of what it supports. Do not post private contact information.

The bot checks the form, data references, and site build. If those checks pass, it commits only the changed data files to the `public-data` branch, tags and closes the issue. A failed check leaves the published data unchanged and explains what to fix on the issue. An existing source URL is reused automatically; you do not need to provide a different document just because someone cited it before. Application code stays on the protected `main` branch.

This is **not factual verification**. Automatically submitted facts are assigned low confidence with no maintainer review date. The source may need correction later. Drawn routes are published only as dashed **unverified community proposals**, never as accepted alignments. Grant CC BY 4.0 route permission only for points you created and may license.

The recorded data appears on the website after a build/deployment that reads `public-data`. Deployment is not configured yet. Run `npm run dev:published` locally to preview that branch; restart it to fetch later changes. Website bug reports and code changes remain separate developer work.
