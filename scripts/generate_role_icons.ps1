param(
    [string]$SourceImage = "C:\Users\DELL INSPIRON.DESKTOP-F3BSO15\Downloads\Iconos.png"
)

$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Drawing

$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$mainRes = Join-Path $root "app\src\main\res"

if (-not (Test-Path $SourceImage)) {
    throw "No se encontro la imagen de iconos: $SourceImage"
}

$roles = @(
    @{
        SourceSet = "cliente"
        Crop = New-Object System.Drawing.Rectangle 45, 35, 735, 735
    },
    @{
        SourceSet = "delivery"
        Crop = New-Object System.Drawing.Rectangle 970, 35, 735, 735
    }
)

$files = Get-ChildItem -Path $mainRes -Directory -Filter "mipmap-*" |
    ForEach-Object { Get-ChildItem -Path $_.FullName -Filter "ic_launcher*.png" }

function Save-ResizedCrop {
    param(
        [System.Drawing.Image]$Source,
        [System.Drawing.Rectangle]$Crop,
        [string]$TargetPath,
        [int]$Width,
        [int]$Height
    )

    $target = New-Object System.Drawing.Bitmap $Width, $Height, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $graphics = [System.Drawing.Graphics]::FromImage($target)
    try {
        $graphics.Clear([System.Drawing.Color]::Transparent)
        $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $dest = New-Object System.Drawing.Rectangle 0, 0, $Width, $Height
        $graphics.DrawImage($Source, $dest, $Crop, [System.Drawing.GraphicsUnit]::Pixel)
    } finally {
        $graphics.Dispose()
    }

    $targetDir = Split-Path $TargetPath -Parent
    New-Item -ItemType Directory -Force -Path $targetDir | Out-Null
    $target.Save($TargetPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $target.Dispose()
}

$source = [System.Drawing.Image]::FromFile($SourceImage)
try {
    foreach ($role in $roles) {
        foreach ($file in $files) {
            $probe = [System.Drawing.Image]::FromFile($file.FullName)
            try {
                $relativePath = $file.FullName.Substring($mainRes.Length).TrimStart("\")
                $targetPath = Join-Path $root (Join-Path "app\src\$($role.SourceSet)\res" $relativePath)
                Save-ResizedCrop `
                    -Source $source `
                    -Crop $role.Crop `
                    -TargetPath $targetPath `
                    -Width $probe.Width `
                    -Height $probe.Height
            } finally {
                $probe.Dispose()
            }
        }
    }
} finally {
    $source.Dispose()
}

Write-Host "Iconos por rol generados desde ${SourceImage}: $($files.Count * $roles.Count)"
