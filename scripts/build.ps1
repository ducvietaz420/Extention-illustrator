$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$buildRoot = Join-Path $root 'build'
$manifestPath = Join-Path $root 'src/cep/manifest.xml'
[xml]$manifest = Get-Content -LiteralPath $manifestPath -Raw -Encoding UTF8
$release = $manifest.ExtensionManifest.ExtensionBundleVersion
$id = $manifest.ExtensionManifest.ExtensionBundleId
$releaseRoot = Join-Path $buildRoot $release
$extension = Join-Path $releaseRoot $id
$launcher = Join-Path $releaseRoot 'EVENT_DESIGN_TOOLKIT.jsx'
$adminStage = Join-Path $releaseRoot 'admin'
$modules = @('src/host/core.jsx', 'src/host/license-public.jsx', 'src/host/license-signature.jsx',
    'src/host/license.jsx', 'src/host/geometry.jsx', 'src/host/context.jsx',
    'src/host/sync.jsx', 'src/host/text.jsx', 'src/host/fill.jsx')
$utf8 = [Text.UTF8Encoding]::new($true)
$content = foreach ($module in $modules) {
    Get-Content -LiteralPath (Join-Path $root $module) -Raw -Encoding UTF8
}
$core = $content -join ([Environment]::NewLine + [Environment]::NewLine)
$fallback = Get-Content -LiteralPath (Join-Path $root 'src/fallback/launcher.jsx') -Raw -Encoding UTF8
$directories = @($buildRoot, $releaseRoot, $extension, $adminStage,
    (Join-Path $extension 'CSXS'), (Join-Path $extension 'host'))
foreach ($directory in $directories) { New-Item -ItemType Directory -Force -Path $directory | Out-Null }
Copy-Item -Path (Join-Path $root 'src/panel/*') -Destination $extension -Recurse -Force
Copy-Item -LiteralPath $manifestPath -Destination (Join-Path $extension 'CSXS') -Force
[IO.File]::WriteAllText((Join-Path $extension 'host/toolkit.jsx'), $core, $utf8)
[IO.File]::WriteAllText($launcher, "#target illustrator`r`n$core`r`n$fallback", $utf8)
$zipFiles = @(
    $extension, $launcher, (Join-Path $root 'scripts'),
    (Join-Path $root 'install_windows.cmd'), (Join-Path $root 'uninstall_windows.cmd'),
    (Join-Path $root 'diagnose_windows.cmd')
)
foreach ($name in 'README_VI','INSTALL_VI','USER_GUIDE_VI','FEATURE_MATRIX','TEST_PLAN','API_NOTES','CHANGELOG') {
    $zipFiles += Join-Path $root "$name.md"
}
Compress-Archive -LiteralPath $zipFiles -DestinationPath (Join-Path $buildRoot "EVENT_DESIGN_TOOLKIT-Windows-$release-Multi-Version.zip") -Force
$adminFiles = foreach ($name in 'index.html','admin.css','admin.js','license-public.js') {
    $adminFile = Join-Path $adminStage $name
    Copy-Item -LiteralPath (Join-Path $root "admin/$name") -Destination $adminFile -Force
    $adminFile
}
$adminGuide = Join-Path $root 'ADMIN_VI.md'
Copy-Item -LiteralPath $adminGuide -Destination (Join-Path $adminStage 'ADMIN_VI.md') -Force
Compress-Archive -LiteralPath (@($adminFiles) + @($adminGuide)) -DestinationPath (Join-Path $buildRoot "EVENT_DESIGN_TOOLKIT-Admin-$release.zip") -Force
$sourceFiles = @((Join-Path $root 'src'), (Join-Path $root 'tests'), $adminStage) +
    $zipFiles[2..($zipFiles.Length - 1)]
Compress-Archive -LiteralPath $sourceFiles -DestinationPath (Join-Path $buildRoot "EVENT_DESIGN_TOOLKIT-source-$release-Multi-Version.zip") -Force
Write-Host ('Da dong goi {0}: {1}' -f $release, $releaseRoot)
