# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- Employees use the product to understand and improve electricity use in their floor or office area.
- Management uses the product to monitor organization-wide electricity performance, costs, forecasts, unusual usage, reporting, and data quality.

## Product Purpose

The product helps CGC employees and management understand electricity consumption and turn energy data into practical action. Success means employees can see relevant usage and carbon impact, identify or report waste, and contribute saving ideas, while management can oversee usage, expenses, forecasts, anomalies, and the reliability of the underlying data.

## Positioning

The product brings employee participation and management oversight into the same energy-intelligence workflow: floor-level comparison and recommendations connect directly with equipment-waste reports, saving ideas, organization-wide analytics, and data-quality review.

## Operating Context

- Employees review electricity use for their own floor or office area and compare it with other floors.
- Employees receive practical recommendations relevant to their floor or work area.
- Employees view estimated carbon emissions associated with electricity use.
- Employees report energy waste associated with equipment and submit energy-saving ideas.
- Management reviews total electricity usage and expenses.
- Management analyzes usage per employee, unusual consumption, consumption forecasts, cost forecasts, management reports, and data quality.

## Capabilities and Constraints

- The frontend is an existing Next.js 16 web application using React 19, TypeScript, and Tailwind CSS 4.
- A separate backend integrating a Copilot Studio agent and additional machine-learning capabilities is intended, but its architecture and exact model responsibilities are not yet decided.
- Employee-level usage is analytical or estimated unless supported by appropriate metering; it must not be represented as directly measured individual consumption without evidence.
- The official product name, authentication and authorization model, employee privacy rules, accessibility target, deployment environment, and detailed approval workflows remain open decisions.

## Brand Commitments

- Use a familiar, polished enterprise energy-dashboard language rather than an experimental visual metaphor.
- The initial mockup presents one unified experience for employees and management; it does not split the interface by role.
- User-supplied dashboard references establish a dense enterprise operations layout: dark navigation, white analytical panels, teal energy cues, strong sans-serif typography, prominent charts, practical insights, and a persistent Energy Copilot entry point.

## Evidence on Hand

- `data/CGC_Energy_AgentThon_Data_Template_1.xlsx` contains electricity records by floor and month, floor metadata, occupancy, emission factors, tariff information, recommendations, and a data-issue log.
- `data/Temperature & Lighting-1.pdf` contains equipment information related to temperature and lighting.
- No approved CGC logo, brand system, testimonials, customer claims, benchmarks, or production deployment claims are currently present in the repository; future work must not fabricate them.

## Product Principles

1. Turn energy measurements into practical, role-relevant action.
2. Make comparisons and estimates transparent about their source and limitations.
3. Support employee participation without overstating individual attribution.
4. Give management a concise path from anomalies and forecasts to decisions.
5. Surface data quality alongside every decision that depends on it.
