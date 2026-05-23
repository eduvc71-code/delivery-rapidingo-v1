param(
    [ValidateSet("Debug", "Release")]
    [string]$BuildType = "Debug"
)

$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$gradlew = Join-Path $root "gradlew.bat"
$distDir = Join-Path $root "dist\android"
$buildTypeLower = $BuildType.ToLowerInvariant()

if (-not (Test-Path $gradlew)) {
    throw "No se encontro gradlew.bat en $root"
}

New-Item -ItemType Directory -Force -Path $distDir | Out-Null

& $gradlew ":app:assembleCliente$BuildType" ":app:assembleDelivery$BuildType"
if ($LASTEXITCODE -ne 0) {
    throw "Gradle termino con codigo $LASTEXITCODE"
}

$outputs = @(
    @{
        Role = "cliente"
        Source = Join-Path $root "app\build\outputs\apk\cliente\$buildTypeLower\app-cliente-$buildTypeLower.apk"
    },
    @{
        Role = "delivery"
        Source = Join-Path $root "app\build\outputs\apk\delivery\$buildTypeLower\app-delivery-$buildTypeLower.apk"
    }
)

foreach ($apk in $outputs) {
    if (-not (Test-Path $apk.Source)) {
        throw "No se encontro la APK esperada: $($apk.Source)"
    }

    New-Item -ItemType Directory -Force -Path $distDir | Out-Null
    $target = Join-Path $distDir "rapidingo-$($apk.Role)-$buildTypeLower.apk"
    Copy-Item -Force -Path $apk.Source -Destination $target
    Write-Host "APK $($apk.Role): $target"
}
