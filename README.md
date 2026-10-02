# Phuttinan — Personal Portfolio

A personal portfolio for a backend and fullstack developer, presented as an API workspace. Explore the person behind the endpoints: selected projects, experience, technology stack, and ways to get in touch.

**[Visit the portfolio →](https://phuttinan.dev)**

## Explore

| Endpoint      | What you will find                                   |
| ------------- | ---------------------------------------------------- |
| `/me`         | Introduction, background, and featured work          |
| `/projects`   | Selected projects with filters and detailed previews |
| `/experience` | Work experience and responsibilities                 |
| `/stack`      | Technologies and tools                               |
| `/contact`    | Email, social profiles, and résumé                   |

Each view loads a real API response. Switch between Preview, JSON, and Headers, or press Send to fetch it again. Request history and a session cache make revisiting views quick. Share a view directly with a link such as [Projects](https://phuttinan.dev/?endpoint=projects).

The interface supports dark and light themes, mobile navigation, keyboard shortcuts, and reduced motion. Use **Ctrl/Cmd+K** to find an endpoint and **Ctrl/Cmd+Enter** to send a request.

## Built with

- **Frontend:** Nuxt 4, Vue, TypeScript, Nuxt UI, Tailwind CSS, and Pinia.
- **API:** Nuxt/Nitro server routes and typed Axios services, with SSR support.
- **Data:** PostgreSQL and Prisma, with private drafts and published content.
- **Administration:** Secured content, navigation, media, and access management.
- **Deployment:** Git-connected Vercel Preview and Production deployments.

Content is managed through the admin application. Public endpoints serve published records, so draft edits remain private until publication. Media supports configurable object storage; public files are served through the application's media routes.

## Local development

Use Node.js 22.12 or newer. Configure the required services and secrets in an ignored `.env` file using the environment and deployment guides below.

```sh
npm install
npm run env:check
npm run db:deploy
npm run db:seed
npm run dev
```

Open `http://localhost:3000`. The seed imports initial portfolio content without overwriting existing records. For Docker development:

```sh
docker compose -f compose.dev.yml up --build app
```

Admin setup, invitations, OAuth providers, and publishing are documented in [the admin guide](docs/phase-3-auth-admin.md).

## Project structure

```text
app/
  pages/              Public route and admin pages
  components/
    workspace/        Portfolio shell, preview, tabs, and project dialog
    portfolio/        Custom-page block renderers
    admin/            Admin interface components
  composables/        Reactive state and feature coordination
  lib/api/            Shared Axios client and feature-specific API services
  types/              Frontend contracts and editor models
server/               API routes, services, and security boundaries
shared/               Shared schemas, API types, and initial seed data
prisma/               Database schema and seed
tests/                API, content, authentication, and security tests
```

The root page composes the workspace. Individual views own their presentation, while shared request handling and reusable functions live outside page scripts. See [frontend architecture](docs/frontend-structure.md) for the component and API boundaries.

## Checks

```sh
npm run typecheck
npm run build
npm run test:frontend
npm run test:access
npm run test:oauth
npm run test:content
npm run test:media
npm run test:security
```

For deployment and operations, see [the deployment guide](docs/phase-5-deployment.md). Media workflows are described in [the media guide](docs/phase-4-media.md).

Project artwork currently includes concept illustrations, identified with a CONCEPT label. These represent the projects rather than screenshots of their running applications.
