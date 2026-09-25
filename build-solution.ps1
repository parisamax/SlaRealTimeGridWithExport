[CmdletBinding()]
param(
    [ValidateSet("Debug", "Release")]
    [string]$Configuration = "Debug",

    [switch]$SkipNpmInstall
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$rootPath = $PSScriptRoot
$pcfPath = Join-Path $rootPath "SlaRealtimeGrid"
$solutionPath = Join-Path $rootPath "solution"
$solutionProject = Join-Path $solutionPath "SlaRealTimeGridWithExport.cdsproj"
$controlsPath = Join-Path $pcfPath "out\controls"
$controlOutputPath = Join-Path $controlsPath "SlaGridControl"
$stagingPath = Join-Path $pcfPath "out\.SlaGridControl-staging"

function Invoke-CheckedCommand {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Command,

        [Parameter(Mandatory = $true)]
        [string[]]$Arguments
    )

    Write-Host "> $Command $($Arguments -join ' ')" -ForegroundColor DarkGray
    & $Command @Arguments

    if ($LASTEXITCODE -ne 0) {
        throw "Command failed with exit code ${LASTEXITCODE}: $Command"
    }
}

function Assert-PathExists {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path,

        [Parameter(Mandatory = $true)]
        [string]$Description
    )

    if (-not (Test-Path -LiteralPath $Path)) {
        throw "$Description was not found: $Path"
    }
}

Assert-PathExists -Path $pcfPath -Description "PCF project directory"
Assert-PathExists -Path $solutionPath -Description "Solution project directory"
Assert-PathExists -Path $solutionProject -Description "Solution project"
Assert-PathExists -Path (Join-Path $pcfPath "package.json") -Description "package.json"
Assert-PathExists -Path (Join-Path $pcfPath "ControlManifest.Input.xml") -Description "PCF manifest"

Write-Host "Building SLA Real-Time Grid with Export" -ForegroundColor Cyan
Write-Host "Configuration: $Configuration"

Push-Location $pcfPath
try {
    if (-not $SkipNpmInstall -and -not (Test-Path -LiteralPath (Join-Path $pcfPath "node_modules"))) {
        Write-Host "Installing npm dependencies..." -ForegroundColor Cyan
        Invoke-CheckedCommand -Command "npm" -Arguments @("ci")
    }

    if (-not (Test-Path -LiteralPath (Join-Path $pcfPath "node_modules"))) {
        throw "node_modules is missing. Run npm ci or omit -SkipNpmInstall."
    }

    Write-Host "Cleaning previous PCF output..." -ForegroundColor Cyan
    Remove-Item -LiteralPath (Join-Path $pcfPath "out") -Recurse -Force -ErrorAction SilentlyContinue
    Remove-Item -LiteralPath (Join-Path $pcfPath "bin") -Recurse -Force -ErrorAction SilentlyContinue
    Remove-Item -LiteralPath (Join-Path $pcfPath "obj") -Recurse -Force -ErrorAction SilentlyContinue

    Write-Host "Building the PCF bundle in production mode..." -ForegroundColor Cyan
    Invoke-CheckedCommand -Command "npm" -Arguments @("run", "build", "--", "--buildMode", "production")

    Assert-PathExists -Path (Join-Path $controlsPath "ControlManifest.xml") -Description "Generated ControlManifest.xml"
    Assert-PathExists -Path (Join-Path $controlsPath "bundle.js") -Description "Generated bundle.js"

    # The solution packager expects one directory per control beneath out\controls.
    # Stage everything first so nested resource directories are preserved safely.
    Write-Host "Preparing the control output structure..." -ForegroundColor Cyan
    Remove-Item -LiteralPath $stagingPath -Recurse -Force -ErrorAction SilentlyContinue
    New-Item -Path $stagingPath -ItemType Directory -Force | Out-Null

    Get-ChildItem -LiteralPath $controlsPath -Force |
        Move-Item -Destination $stagingPath -Force

    New-Item -Path $controlOutputPath -ItemType Directory -Force | Out-Null

    Get-ChildItem -LiteralPath $stagingPath -Force |
        Move-Item -Destination $controlOutputPath -Force

    Remove-Item -LiteralPath $stagingPath -Recurse -Force

    Assert-PathExists -Path (Join-Path $controlOutputPath "ControlManifest.xml") -Description "Staged ControlManifest.xml"
    Assert-PathExists -Path (Join-Path $controlOutputPath "bundle.js") -Description "Staged bundle.js"
}
finally {
    Pop-Location
}

Push-Location $solutionPath
try {
    Write-Host "Cleaning previous solution output..." -ForegroundColor Cyan
    Remove-Item -LiteralPath (Join-Path $solutionPath "bin") -Recurse -Force -ErrorAction SilentlyContinue
    Remove-Item -LiteralPath (Join-Path $solutionPath "obj") -Recurse -Force -ErrorAction SilentlyContinue

    Write-Host "Restoring solution dependencies..." -ForegroundColor Cyan
    Invoke-CheckedCommand -Command "dotnet" -Arguments @("restore", $solutionProject)

    Write-Host "Packaging the Dataverse solution..." -ForegroundColor Cyan
    Invoke-CheckedCommand -Command "dotnet" -Arguments @(
        "build",
        $solutionProject,
        "--configuration",
        $Configuration,
        "--no-dependencies",
        "--no-restore"
    )
}
finally {
    Pop-Location
}

$zipDirectory = Join-Path $solutionPath "bin\$Configuration"
$zip = Get-ChildItem -LiteralPath $zipDirectory -Filter "*.zip" |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1

if (-not $zip) {
    throw "No solution ZIP was generated in $zipDirectory"
}

Add-Type -AssemblyName System.IO.Compression.FileSystem
$archive = [System.IO.Compression.ZipFile]::OpenRead($zip.FullName)

try {
    $entryNames = @($archive.Entries | ForEach-Object { $_.FullName })

    $manifestEntry = $entryNames |
        Where-Object { $_ -match '^Controls/.+/ControlManifest\.xml$' } |
        Select-Object -First 1

    $bundleEntry = $entryNames |
        Where-Object { $_ -match '^Controls/.+/bundle\.js$' } |
        Select-Object -First 1

    if (-not $manifestEntry -or -not $bundleEntry) {
        throw "The generated ZIP does not contain a packaged PCF control."
    }

    Write-Host ""
    Write-Host "Build succeeded and the PCF package was validated." -ForegroundColor Green
    Write-Host "ZIP: $($zip.FullName)"
    Write-Host "Size: $($zip.Length) bytes"
    Write-Host "Control manifest: $manifestEntry"
    Write-Host "Control bundle: $bundleEntry"
}
finally {
    $archive.Dispose()
}
