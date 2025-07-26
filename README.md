# Voting Power Bot

A Telegram bot that tracks and reports significant voting power changes for ENS delegates.

## Features

- **Monthly Summaries**: Reports voting power changes grouped by month.
- **Significant Change Filtering**: Only shows net changes greater than 1,000 ENS per month for each delegate.
- **ENS Name Resolution**: Resolves Ethereum addresses to ENS names.
- **Etherscan & Social Links**: Provides convenient links to Etherscan for addresses and to X (Twitter) profiles if available.
- **Serverless Deployment**: Deployed on Cloudflare Workers for high availability and performance.

## Commands

- `/start`: Displays a welcome message.
- `/recent`: Shows the latest significant voting power changes.
