# SLA Real-Time Grid PCF

A dataset Power Apps Component Framework control for Dynamics 365 Customer
Service. It displays Cases with live countdowns and status indicators for two
configurable SLA stages, together with filtering, paging and Excel export.

## Features

- Real-time First Response and Resolution countdowns
- On Track, Warning, Breached, Paused, Succeeded and Canceled states
- Optional negative countdown after breach
- Agent and admin layouts
- Client-side search and SLA filters
- Excel export
- Configurable SLA Item names, grid title and first-stage label

## Prerequisites

- Dynamics 365 Customer Service with enhanced SLAs enabled
- A Case (`incident`) view used as the dataset
- SLA KPI Instance (`slakpiinstance`) records related to the Cases
- Node.js and Microsoft Power Platform CLI for local development

The control uses only standard Dataverse tables and columns. It does not call
external services.

## Control properties

| Property | Description | Default |
| --- | --- | --- |
| `Cases` | Dataset bound to a Case view | Required |
| `FirstStageSlaItemName` | Exact Dataverse SLA Item name for the first stage | `First Response` |
| `ResolutionSlaItemName` | Exact Dataverse SLA Item name for resolution | `Resolution` |
| `FirstStageLabel` | Label shown for the first-stage columns and export | `First Response` |
| `GridTitle` | Title above the agent grid | `SLA REAL-TIME GRID` |
| `GridSubtitle` | Subtitle above the agent grid | `Real-time view of Case SLA performance` |
| `LayoutMode` | Use `admin` for the summary layout; any other value uses the agent layout | `agent` |
| `EnableNegativeTimer` | Shows elapsed time as a negative value after breach | `true` |

SLA Item name comparisons are case-insensitive but otherwise must match the
names configured in Dataverse.

## Build

```bash
npm ci
npm run lint
npm run build -- --buildMode production
```

The build output is written to `out/controls`.

## Development deployment

Authenticate to a development environment and push the control by supplying
either a solution unique name or a publisher prefix:

```bash
pac auth create --url https://YOUR-ORG.crm.dynamics.com
pac pcf push --publisher-prefix YOUR_PREFIX
```

Do not use `--publisher-prefix` and `--solution-unique-name` in the same
command.

## Configuration

1. Add the control to a Case view or subgrid.
2. Bind `Cases` to the view dataset.
3. Enter the exact names of the two SLA Items used by your SLA configuration.
4. Select `agent` or `admin` through `LayoutMode`.
5. Save and publish the view or form.

The user must have read access to Cases, SLA KPI Instances, SLA Items and the
system view definition used by the control.

## Privacy and external services

The control does not contain environment URLs, credentials, tenant identifiers
or organization-specific schema names. It reads data through the PCF context
and the Dataverse Web API available to the signed-in user.

## Credits and license

This project includes adaptations of
[Modern SLA Timer PCF](https://github.com/moliveirapinto/modern-sla-timer-pcf)
by Mauricio Oliveira. See `THIRD_PARTY_NOTICES.md` and `LICENSE`.

Released under the MIT License.
