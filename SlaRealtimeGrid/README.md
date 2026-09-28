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

This control does not include or create SLA definitions, SLA Items, or SLA KPI
Instance data. The target Dataverse environment must already have its own SLA
configuration.

After installing the control, configure the dataset properties and view columns
according to the SLA setup of the target organization.

## Install the solution

1. Download `SlaRealTimeGridWithExport-managed.zip` from the latest
   [GitHub release](https://github.com/parisamax/SlaRealTimeGridWithExport/releases/latest).
2. Sign in to [Power Apps](https://make.powerapps.com/) and select the target
   Dataverse environment.
3. Open **Solutions** and select **Import solution**.
4. Upload `SlaRealTimeGridWithExport-managed.zip`.
5. Complete the import and publish all customizations.

The managed solution installs only the PCF control. It does not create SLA
definitions, SLA Items, views, security roles, or organization-specific data.

## Apply the control to a Case view

### 1. Create or select a Case view

Create or use a public/system view for the Case (`incident`) table.

Personal views are not recommended because the control uses the Dataverse
system view definition when loading and filtering records across all pages.

The filters configured on the Case view determine which Cases are available
to the control.

### 2. Add the required Case columns

The Case view should include the following columns:

- Case Number (`ticketnumber`)
- Title (`title`)
- Priority (`prioritycode`)
- Owner (`ownerid`)

The control retrieves SLA KPI Instance and SLA Item information separately
through the Dataverse Web API, so SLA KPI columns don't need to be added to
the Case view.

### 3. Add the view to an unmanaged configuration solution

The installed PCF solution is managed and should not be modified directly.

1. Create or open an unmanaged solution in the target environment.
2. Add the Case table to the solution.
3. Include the system view where the control will be used.
4. Open the Case table in the solution.

### 4. Configure the control on a specific view

The exact designer options can vary between Power Apps environments. If the
modern view designer provides a **Custom controls** or **Components** option,
you can select the control there.

The documented classic solution explorer procedure is:

1. Open the unmanaged configuration solution.
2. Select **Switch to classic** or open the classic solution explorer.
3. Expand **Entities** and then select **Case**.
4. Select **Views**.
5. Open the system view where the control should appear.
6. Select **Custom Controls** from the right-hand menu.
7. Select **Add Control**.
8. Select **SLA Real-Time Grid** and then select **Add**.
9. Enable the control for **Web**. Enable Phone or Tablet only after testing
   the control on those clients.
10. If prompted for the dataset, bind `Cases` to the current view dataset.
11. Configure the control properties.
12. Select **OK**, then **Save and Close**.
13. Select **Publish All Customizations**.

### 5. Configure the control properties

| Property | Example | Description |
| --- | --- | --- |
| `Cases` | Current Case view dataset | Dataset displayed by the control |
| `FirstStageSlaItemName` | `First Response` | Exact name of the first-stage SLA Item |
| `ResolutionSlaItemName` | `Resolution` | Exact name of the resolution SLA Item |
| `FirstStageLabel` | `First Response` | Label displayed for the first SLA stage |
| `GridTitle` | `CUSTOMER SUPPORT SLA` | Optional title above the grid |
| `GridSubtitle` | `Real-time SLA monitoring for active Cases` | Optional subtitle |
| `LayoutMode` | `agent` | Use `admin` for summary cards or `agent` for the standard grid |
| `EnableNegativeTimer` | `Yes` | Shows elapsed time as a negative value after an SLA breach |

`FirstStageSlaItemName` and `ResolutionSlaItemName` must match the Dataverse
SLA Item names exactly. Comparisons are case-insensitive, but otherwise the
names must be identical.

For example, if the target organization uses an SLA Item named
`First Handling`, configure:

```text
FirstStageSlaItemName = First Handling
FirstStageLabel = First Handling




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
