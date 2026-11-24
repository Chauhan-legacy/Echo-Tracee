# Copyright 2026 Priyansh Chauhan | SPDX-License-Identifier: Apache-2.0
# scripts/make-zips.ps1 - Generates 6 Submission Tiers for Embarko Challenge & GitHub
param(
    [string]$OutputDir = "release-zips"
)

$ErrorActionPreference = "Stop"

Write-Host "=== ECHO//TRACE ZIP PACKAGING ENGINE ===" -ForegroundColor Green

# Ensure releases folder exists
if (Test-Path $OutputDir) {
    Remove-Item -Path $OutputDir -Recurse -Force
}
New-Item -Path $OutputDir -ItemType Directory -Force | Out-Null

# 1. Run distributions preparation
Write-Host "`n[1/4] Preparing dist-a-site and dist-b-library..." -ForegroundColor Cyan
npx.cmd tsx scripts/prepareDistributions.ts

# 2. Build production app dist if not present
if (-not (Test-Path "dist/index.html")) {
    Write-Host "[2/4] Building production app dist..." -ForegroundColor Cyan
    npm.cmd run build
}

# 3. Build library bundles
Write-Host "[3/4] Building library single-file bundle..." -ForegroundColor Cyan
npx.cmd tsx scripts/buildLibrary.ts

# Helper function to create clean zip without junk
function Create-CleanZip {
    param(
        [string]$SourcePath,
        [string]$DestinationZip,
        [string[]]$Excludes = @("node_modules", ".git", "*.tsbuildinfo", ".DS_Store", "coverage", "screenshots", "test-media", "*.mp4", "*.wav")
    )
    $tmpDir = Join-Path $OutputDir ("tmp_" + [System.IO.Path]::GetFileNameWithoutExtension($DestinationZip))
    if (Test-Path $tmpDir) { Remove-Item $tmpDir -Recurse -Force }
    New-Item -ItemType Directory -Path $tmpDir -Force | Out-Null

    # Copy files
    if (Test-Path $SourcePath -PathType Container) {
        Get-ChildItem -Path $SourcePath -Recurse | ForEach-Object {
            $rel = Resolve-Path -Path $_.FullName -Relative
            $skip = $false
            foreach ($ex in $Excludes) {
                if ($rel -like "*$ex*") { $skip = $true; break }
            }
            if (-not $skip) {
                $target = Join-Path $tmpDir ($_.FullName.Substring($SourcePath.Length).TrimStart('\', '/'))
                if ($_.PSIsContainer) {
                    New-Item -ItemType Directory -Path $target -Force | Out-Null
                } else {
                    $parent = Split-Path $target -Parent
                    if (-not (Test-Path $parent)) { New-Item -ItemType Directory -Path $parent -Force | Out-Null }
                    Copy-Item -Path $_.FullName -Destination $target -Force
                }
            }
        }
    } else {
        Copy-Item -Path $SourcePath -Destination $tmpDir -Force
    }

    # Compress
    if (Test-Path $DestinationZip) { Remove-Item $DestinationZip -Force }
    Compress-Archive -Path "$tmpDir\*" -DestinationPath $DestinationZip -CompressionLevel Optimal
    Remove-Item $tmpDir -Recurse -Force
}

Write-Host "`n[4/4] Generating all 6 ZIP tiers..." -ForegroundColor Cyan

# Tier S - Site (minimal dist/ only)
$zipSiteS = Join-Path $OutputDir "echotrace-site-tierS.zip"
Create-CleanZip -SourcePath "dist" -DestinationZip $zipSiteS

# Tier M - Site (source code without media or node_modules)
$zipSiteM = Join-Path $OutputDir "echotrace-site-tierM.zip"
Create-CleanZip -SourcePath "dist-a-site" -DestinationZip $zipSiteM

# Tier L - Site (full repo-ready site with all configs)
$zipSiteL = Join-Path $OutputDir "echotrace-site-tierL.zip"
Create-CleanZip -SourcePath "dist-a-site" -DestinationZip $zipSiteL

# Tier S - Library (minimal .min.js + .d.ts only)
$libMinDir = Join-Path $OutputDir "lib_tierS_temp"
New-Item -ItemType Directory -Path $libMinDir -Force | Out-Null
Copy-Item "packages/echotrace-math/dist/echotrace-math.min.js" $libMinDir
Copy-Item "packages/echotrace-math/dist/index.d.ts" $libMinDir
$zipLibS = Join-Path $OutputDir "echotrace-lib-tierS.zip"
Create-CleanZip -SourcePath $libMinDir -DestinationZip $zipLibS
Remove-Item $libMinDir -Recurse -Force

# Tier M - Library (source only + package.json + tsconfig)
$libMDir = Join-Path $OutputDir "lib_tierM_temp"
New-Item -ItemType Directory -Path $libMDir -Force | Out-Null
Copy-Item "packages/echotrace-math/src" $libMDir -Recurse
Copy-Item "packages/echotrace-math/package.json" $libMDir
Copy-Item "packages/echotrace-math/tsconfig.json" $libMDir
$zipLibM = Join-Path $OutputDir "echotrace-lib-tierM.zip"
Create-CleanZip -SourcePath $libMDir -DestinationZip $zipLibM
Remove-Item $libMDir -Recurse -Force

# Tier L - Library (full open-source distribution with docs/MATH.md, examples, tests)
$zipLibL = Join-Path $OutputDir "echotrace-lib-tierL.zip"
Create-CleanZip -SourcePath "dist-b-library" -DestinationZip $zipLibL

Write-Host "`n=================================================================" -ForegroundColor Green
Write-Host "                  SIX ZIP TIERS SIZE REPORT                      " -ForegroundColor Green
Write-Host "=================================================================" -ForegroundColor Green
Write-Host ("Tier".PadRight(28) + "Zip Size (kB)".PadRight(16) + "Zip Size (MB)")
Write-Host "-----------------------------------------------------------------"

$allZips = @($zipSiteS, $zipSiteM, $zipSiteL, $zipLibS, $zipLibM, $zipLibL)
foreach ($z in $allZips) {
    if (Test-Path $z) {
        $len = (Get-Item $z).Length
        $kb = [math]::Round($len / 1KB, 2)
        $mb = [math]::Round($len / 1MB, 2)
        $name = [System.IO.Path]::GetFileName($z)
        Write-Host ($name.PadRight(28) + "$kb kB".PadRight(16) + "$mb MB")
    }
}
Write-Host "=================================================================`n" -ForegroundColor Green
