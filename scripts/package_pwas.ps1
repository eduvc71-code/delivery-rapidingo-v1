param(
  [string]$DistPath = "dist"
)

$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$dist = Join-Path $root $DistPath

if (!(Test-Path $dist)) {
  throw "No existe $dist. Ejecuta primero npm run build."
}

$apps = @(
  @{
    Folder = "cliente"
    Role = "client"
    Name = "Rapidingo Cliente"
    Theme = "#FFC107"
    ManifestSource = "manifest-client.json"
    Icon192 = "client-192.png"
    Icon512 = "client-512.png"
  },
  @{
    Folder = "delivery"
    Role = "delivery"
    Name = "Rapidingo Delivery"
    Theme = "#FFC107"
    ManifestSource = "manifest-delivery.json"
    Icon192 = "delivery-192.png"
    Icon512 = "delivery-512.png"
  }
)

foreach ($app in $apps) {
  $target = Join-Path $dist $app.Folder
  if (Test-Path $target) {
    Remove-Item -LiteralPath $target -Recurse -Force
  }
  New-Item -ItemType Directory -Force -Path $target | Out-Null

  Copy-Item -LiteralPath (Join-Path $dist "index.html") -Destination (Join-Path $target "index.html")
  $swSource = Join-Path $dist "sw.js"
  if (!(Test-Path $swSource)) {
    $swSource = Join-Path $root "sw.js"
  }
  Copy-Item -LiteralPath $swSource -Destination (Join-Path $target "sw.js")

  Copy-Item -LiteralPath (Join-Path $dist "assets") -Destination (Join-Path $target "assets") -Recurse
  Copy-Item -LiteralPath (Join-Path $dist "icons") -Destination (Join-Path $target "icons") -Recurse

  $manifestSource = Join-Path $dist $app.ManifestSource
  if (!(Test-Path $manifestSource)) {
    $manifestSource = Join-Path $root $app.ManifestSource
  }
  Copy-Item -LiteralPath $manifestSource -Destination (Join-Path $target "manifest.json")

  $indexPath = Join-Path $target "index.html"
  $index = Get-Content -LiteralPath $indexPath -Raw
  $index = $index -replace "/Delivery_Rapidingo/", "./"
  $index = $index -replace "/delivery-rapidingo/", "./"
  $index = $index -replace "/delivery-rapidingo-v1/", "./"
  $index = $index -replace '<link rel="manifest" href="\./manifest\.json" id="app-manifest">', '<link rel="manifest" href="./manifest.json" id="app-manifest">'
  $index = $index -replace "var role = new URLSearchParams\(window\.location\.search\)\.get\('role'\);", "var role = '$($app.Role)';"
  $index = $index -replace "window\.__RAPIDINGO_ROLE = role \|\| '';", "window.__RAPIDINGO_ROLE = '$($app.Role)';"
  $index = $index -replace "manifest = './manifest-client.json';", "manifest = './manifest.json';"
  $index = $index -replace "manifest = './manifest-delivery.json';", "manifest = './manifest.json';"
  $index = $index -replace '<title>.*?</title>', "<title>$($app.Name)</title>"
  Set-Content -LiteralPath $indexPath -Value $index -Encoding UTF8

  $manifestPath = Join-Path $target "manifest.json"
  $manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
  $manifest.id = "./"
  $manifest.start_url = "./"
  $manifest.scope = "./"
  $manifest.name = $app.Name
  $manifest.short_name = $app.Name
  $manifest.theme_color = $app.Theme
  $manifest.icons[0].src = "icons/$($app.Icon192)"
  $manifest.icons[1].src = "icons/$($app.Icon512)"
  $manifest | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $manifestPath -Encoding UTF8

  $swPath = Join-Path $target "sw.js"
  $sw = Get-Content -LiteralPath $swPath -Raw
  $sw = $sw -replace "rapidingo-v4", "rapidingo-$($app.Folder)-v2"
  $sw = $sw -replace "\s*'\./manifest-client\.json',\r?\n", ""
  $sw = $sw -replace "\s*'\./manifest-delivery\.json',\r?\n", ""
  $sw = $sw -replace "\s*'\./icons/icon-192\.png',\r?\n", ""
  $sw = $sw -replace "\s*'\./icons/icon-512\.png',\r?\n", ""
  Set-Content -LiteralPath $swPath -Value $sw -Encoding UTF8
}

Write-Host "PWAs separadas creadas:"
foreach ($app in $apps) {
  Write-Host " - $(Join-Path $dist $app.Folder)"
}
