Run from the repository root with Python 3.10 or newer:

```powershell
python -m venv backend/.venv
backend/.venv/Scripts/python -m pip install -r backend/requirements.txt
backend/.venv/Scripts/python -m uvicorn backend.main:app --reload --port 8000
```

Set `NEXT_PUBLIC_FORECAST_API_URL=http://localhost:8000` in root `.env.local`, then restart `npm run dev`. Open `/insights` and select the Forecast tab or use the forecast panel in Overview. API documentation is at `http://localhost:8000/docs`.

For the production frontend, set `NEXT_PUBLIC_FORECAST_API_URL=https://cgc-agent-thon2026-api-ws4c-iota.vercel.app` in the Vercel frontend project's Production environment and redeploy. Next.js embeds this public URL at build time; changing it requires a new frontend build. Do not upload `.env.local` to Vercel. There is no localhost fallback. Missing or invalid settings, and localhost or HTTP backends on a deployed frontend, produce a configuration error in the existing Insights error state.

FastAPI CORS permits `http://localhost:3000` and `https://cgc-agent-thon2026.vercel.app`. Redeploy the backend to apply CORS changes. Other origins, including Vercel preview URLs, are not permitted. Check `/api/health` on the backend to verify availability; this endpoint does not validate the workbooks.

The service reads the original root `data` workbooks on each forecast request, so changes are picked up without copying files or restarting. The health endpoint checks the running service; forecast endpoints return 503 when workbook loading fails.


Normal growth compares the same available, non-anomalous months in 2025 and 2026. Known abnormal floor/month pairs are removed from both sums. A zero or unavailable baseline produces null forecasts rather than an invented growth rate. Annual and building monthly totals require all contributing values; incomplete totals remain null. Building growth is weighted by the eligible 2025 baseline; forecasts are calculated per floor before aggregation. Expected Growth is this normal trend, not the percentage difference between the projected total and the anomaly-inflated 2026 total.

The comparison endpoint returns `baselineGrowth` and `movingAverage`. The latter recursively averages the previous three consecutive months, starting with October–December 2026. Future unrounded predictions enter the rolling window, while API predictions are rounded to whole kWh. Missing window values produce null predictions. This raw moving-average comparator does not apply the baseline method's anomaly adjustments.

```powershell
backend/.venv/Scripts/python -m unittest discover -s backend/tests -v
```
