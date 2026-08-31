# This is iWDC-1 Project

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Local Development Setup

### Prerequisites

- [Node.js](https://nodejs.org) 20.9.0 or later (verified on v24.15.0)
- npm (bundled with Node.js; this repository is managed with `package-lock.json`)
- Git

Check your versions with:

```bash
node -v
npm -v
```

### Setup

1. Clone the repository

   ```bash
   git clone https://github.com/Seigo2058/iWDC-1.git
   cd iWDC-1/iwdc-1
   ```

2. Install dependencies

   ```bash
   npm install
   ```

3. Start the development server

   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

Edit `app/page.tsx` and the page will update automatically.

### Available Scripts

| Command         | Description                                            |
| --------------- | ------------------------------------------------------ |
| `npm run dev`   | Start the development server                           |
| `npm run build` | Create a production build                              |
| `npm run start` | Serve the production build (run `npm run build` first) |
| `npm run lint`  | Check the code with ESLint                             |

### Troubleshooting

- **Port 3000 is already in use**: specify another port, e.g. `npm run dev -- -p 3001`.
- **Dependency installation fails**: try a clean install with `rm -rf node_modules && npm install`.
- **Stale build output**: remove the build cache with `rm -rf .next` and run the command again.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
