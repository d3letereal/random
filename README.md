# Multiplayer Globe App

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/cloudflare/templates/tree/main/multiplayer-globe-template)

![Multiplayer Globe Template Preview](https://imagedelivery.net/wSMYJvS3Xw-n339CbDyDIA/43100bd9-8e11-4c20-cc00-3bec86253f00/public)

<!-- dash-content-start -->

Using the power of [Durable Objects](https://developers.cloudflare.com/durable-objects/), this example shows website visitor locations in real-time. Anyone around the world visiting the [demo website](https://multiplayer-globe-template.templates.workers.dev) will be displayed as a dot on the globe! This template is powered by [PartyKit](https://www.partykit.io/).

## How It Works

Each time someone visits the page, a WebSocket connection is opened with a Durable Object that manages the state of the globe. Visitors are placed on the globe based on the geographic location of their IP address, which is exposed as a [property on the initial HTTP request](https://developers.cloudflare.com/workers/runtime-apis/request/#incomingrequestcfproperties) that establishes the WebSocket connection.

The Durable Object instance that manages the state of the globe runs in one location, and handles all incoming WebSocket connections. When a new connection is established, the Durable Object broadcasts the location of the new visitor to all other active visitors, and the client adds the new visitor to the globe visualization. When someone leaves the page and their connection is closed, the Durable Object similarly broadcasts their removal. The Durable Object instance remains active as long as there is at least one open connection. If all open connections are closed, the Durable Object instance is purged from memory and remains inactive until a new visitor lands on the page, opens a connection, and restarts the lifecycle.

## More on Durable Objects

In this template, only one Durable Object instance is created, since all visitors should see updates from all other visitors, everywhere in the world. A more complex version of this application could instead show a map of the country the visitor is located in, and only display markers for other visitors who are located in the same country. In this case, a Durable Object instance would be created for each country, and the client would connect to and receive updates from the Durable Object instance corresponding to the visitor's country.

For this example, Durable Objects are used for synchronizing but not storing state. Since visitor connections are ephemeral, and tied to the in-memory lifespan of the Durable Object instance, there's no need to use persistent storage. However, a more complex version of this application could display the all-time visitor count, which needs to be persisted beyond the in-memory lifespan of the Durable Object. In this case, the Durable Object code would use the [Durable Object Storage API](https://developers.cloudflare.com/durable-objects/api/storage-api/) to persist the value of the counter.

<!-- dash-content-end -->

## Getting Started

Outside of this repo, you can start a new project with this template using [C3](https://developers.cloudflare.com/pages/get-started/c3/) (the `create-cloudflare` CLI):

```
npm create cloudflare@latest -- --template=cloudflare/templates/multiplayer-globe-template
```

A live public deployment of this template is available at [https://multiplayer-globe-template.templates.workers.dev](https://multiplayer-globe-template.templates.workers.dev)

## Setup Steps

1. Install the project dependencies with a package manager of your choice:
   ```bash
   npm install
   ```
2. Deploy the project
   ```bash
   npx wrangler deploy
   ```
3. And monitor your workers!
   ```bash
   npx wrangler tail
   ```

## Protected preview developer menu

The preview build has an optional server-authorized developer menu. It can join a full lobby, change any player's current answer, and display temporary text on every connected player's screen. The commands are denied by the Durable Object unless the WebSocket upgrade carried a cryptographically verified Cloudflare Access identity.

### 1. Put Cloudflare Access in front of the preview URL

In **Zero Trust → Access controls → Applications**, add a self-hosted application for the exact preview hostname. Add one Allow policy with an **Emails** include rule containing only your Cloudflare identity email. Do not use a bypass policy. Copy the application's Audience (AUD) tag.

Cloudflare Access must cover the whole preview hostname, including `/party/*` WebSocket upgrades. The Worker validates `Cf-Access-Jwt-Assertion` again using your account's rotating JWKS; it does not trust the email header on its own.

### 2. Configure preview-only bindings

Copy `.dev.vars.example` to `.dev.vars` for local testing, or attach these four text bindings only to the preview Worker/version:

```dotenv
DEBUG_TOOLS_ENABLED="true"
CF_ACCESS_TEAM_DOMAIN="https://YOUR_TEAM.cloudflareaccess.com"
CF_ACCESS_AUD="YOUR_ACCESS_APPLICATION_AUD_TAG"
CF_ACCESS_ALLOWED_EMAIL="you@example.com"
```

`CF_ACCESS_TEAM_DOMAIN` must include `https://`. The email must exactly match the `email` claim in your Access identity (comparison is case-insensitive).

### 3. Keep production fail-closed

Do not add `DEBUG_TOOLS_ENABLED` to the production Worker. There is intentionally no production value in `wrangler.json`. Without the binding, JWT verification is skipped, no socket receives developer authority, the menu is never rendered, full-room bypass stays disabled, and debug commands are ignored server-side even if a client sends them manually.

To verify the fail-closed behavior, `GET /api/debug-session` returns `404` with `{ "enabled": false }` when the binding is absent or identity verification fails. On the protected preview, it returns the verified email.
