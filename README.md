# RL Shop Bot

A Discord bot that scrapes the featured shop from [rlshop.gg](https://rlshop.gg/) and posts one message whenever the shop changes.

## Setup

1. Create an application and bot in the [Discord Developer Portal](https://discord.com/developers/applications).
2. Copy `.env.example` to `.env` and add the bot token and application ID.
3. Install dependencies and start the bot:

   ```sh
   npm install
   npm run build
   npm start
   ```

4. Invite the bot with the `bot` and `applications.commands` scopes. It needs View Channel, Send Messages, and Embed Links permissions.
5. Run `/subscribe` in the channel that should receive daily posts.

Set `DISCORD_GUILD_ID` during development to make slash-command updates appear immediately. Without it, commands are registered globally and may take up to an hour to appear.

Subscriptions and sent-shop hashes are stored in `data/state.json`. Persist that directory when deploying the bot in a container.

## Commands

- `/shop`: Display the current featured shop on demand.
- `/subscribe`: Send future shop updates to the current channel. Requires Manage Server.
- `/unsubscribe`: Disable automatic posts for the server. Requires Manage Server.

The scraper depends on rlshop.gg's HTML structure. If it changes, the bot logs `No shop items found; rlshop.gg markup may have changed` instead of posting an empty shop.