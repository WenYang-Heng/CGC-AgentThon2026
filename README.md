# Energy Management Intelligence

## Run locally

Requires Node.js 20.9 or newer and npm.

1. Place the workbook at `data/CGC_Energy_AgentThon_Data_Template_1.xlsx`. It must contain the `Energy_Data`, `Floor_Master`, `Occupancy`, and `Emission_Factor` sheets. The data folder is excluded from Git.
2. Install dependencies: `npm ci`.
3. Start the development server: `npm run dev`.
4. Open http://localhost:3000.

Stop with Ctrl+C; restart with `npm run dev`.

If PowerShell cannot find an existing Node.js installation, run these commands from the project directory:

```powershell
$env:Path = 'C:\Program Files\nodejs;' + $env:Path
npm.cmd run dev
```

For a fresh install in that terminal, run `npm.cmd ci` first.

## Optional Copilot connection

The dashboard runs without Copilot credentials. To connect from `/copilot-test`, create `.env.local` with your published agent and Microsoft Entra application values:

```dotenv
NEXT_PUBLIC_COPILOT_ENVIRONMENT_ID=
NEXT_PUBLIC_COPILOT_TENANT_ID=
NEXT_PUBLIC_COPILOT_SCHEMA_NAME=
NEXT_PUBLIC_COPILOT_CLIENT_ID=
```

Restart the server after editing the environment file. Connection requires an authorized tenant account and an application configured for the local SPA redirect URI.

The optional server-to-server test additionally requires `COPILOT_CLIENT_SECRET` and appropriate tenant permissions:

```powershell
node --env-file=.env.local scripts/test-copilot-s2s.mjs
```

Keep the client secret out of `NEXT_PUBLIC_` variables. Environment files are excluded from Git.

## Checks and production

```shell
npm run lint
npx tsc --noEmit
npm run build
npm start
```

The production build requires the workbook. `npm start` serves a previously completed production build.
