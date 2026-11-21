[CmdletBinding()]
param(
    [Parameter(Mandatory=$true, Position=0)]
    [ValidateSet('Install','Uninstall','Diagnose')][string]$Action,
    [switch]$CheckOnly,
    [string]$IllustratorPath
)
$ErrorActionPreference = 'Stop'
$id = 'com.eventdesigntoolkit.illustrator'
$release = '0.6.0'
$minHostMajor = 22
$minCepMajor = 8
$project = Split-Path -Parent $PSScriptRoot
$extensionRoot = [IO.Path]::GetFullPath((Join-Path $env:APPDATA 'Adobe\CEP\extensions'))
$target = [IO.Path]::GetFullPath((Join-Path $extensionRoot $id))
$userState = Join-Path $env:LOCALAPPDATA 'EventDesignToolkit'
$log = Join-Path $userState 'windows.log'
$appRelative = 'Support Files\Contents\Windows\Illustrator.exe'
if ((Split-Path -Parent $target) -ne $extensionRoot -or (Split-Path -Leaf $target) -cne $id) {
    throw 'Duong dan cai dat khong hop le.'
}

function Write-Log([string]$Message) {
    Write-Host $Message
    if (-not $CheckOnly) {
        Add-Content -LiteralPath $log -Encoding UTF8 -Value ("{0} {1}" -f (Get-Date -Format o), $Message)
    }
}

function Read-Extension([string]$Folder) {
    foreach ($file in 'index.html','CSXS\manifest.xml','host\toolkit.jsx') {
        if (-not (Test-Path -LiteralPath (Join-Path $Folder $file) -PathType Leaf)) {
            throw "Thieu tep bat buoc $file trong $Folder."
        }
    }
    [xml]$manifest = Get-Content -LiteralPath (Join-Path $Folder 'CSXS\manifest.xml') -Raw -Encoding UTF8
    $body = $manifest.ExtensionManifest
    if ($body.ExtensionBundleId -cne $id -or $body.ExtensionList.Extension.Id -cne $id -or
        $body.ExecutionEnvironment.HostList.Host.Name -cne 'ILST' -or
        $body.ExecutionEnvironment.RequiredRuntimeList.RequiredRuntime.Name -cne 'CSXS') {
        throw 'Manifest khong khop ID, host hoac runtime cua toolkit.'
    }
    $resources = $body.DispatchInfoList.Extension.DispatchInfo.Resources
    if ($resources.MainPath -cne './index.html' -or $resources.ScriptPath -cne './host/toolkit.jsx') {
        throw 'Duong dan MainPath hoac ScriptPath khong dung.'
    }
    return $body
}

function Assert-Package([string]$Folder) {
    $body = Read-Extension $Folder
    if ($body.ExtensionBundleVersion -cne $release -or
        $body.ExecutionEnvironment.HostList.Host.Version -cne "$minHostMajor.0" -or
        $body.ExecutionEnvironment.RequiredRuntimeList.RequiredRuntime.Version -cne "$minCepMajor.0") {
        throw 'Manifest khong khop phien ban cua goi cai nay.'
    }
}

function Get-DebugKey([int]$Major) {
    return "HKCU:\Software\Adobe\CSXS.$Major"
}

function Find-Illustrator {
    $roots = @('HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall',
        'HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall',
        'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall')
    $candidates = @(foreach ($root in $roots) {
        Get-ItemProperty -Path "$root\*" -ErrorAction SilentlyContinue |
            Where-Object { $_.DisplayName -like 'Adobe Illustrator*' } |
            ForEach-Object {
                if ($_.InstallLocation) { $_.InstallLocation }
                if ($_.DisplayIcon -match '^\s*"?([^"\r\n]*\\Illustrator\.exe)"?(?:,\s*-?\d+)?\s*$') { $Matches[1] }
            }
    })
    foreach ($hive in 'HKLM:', 'HKCU:') {
        $appPath = Get-Item -LiteralPath "$hive\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\Illustrator.exe" -ErrorAction SilentlyContinue
        if ($appPath) { $candidates += $appPath.GetValue('') }
    }
    foreach ($programRoot in (@($env:ProgramFiles, $env:ProgramW6432, ${env:ProgramFiles(x86)}) | Select-Object -Unique)) {
        if ($programRoot) {
            $candidates += Get-ChildItem -LiteralPath (Join-Path $programRoot 'Adobe') -Directory -Filter 'Adobe Illustrator*' -ErrorAction SilentlyContinue |
                Select-Object -ExpandProperty FullName
        }
    }
    $candidates += Get-Process Illustrator -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Path
    if ($IllustratorPath) {
        $candidates += (Resolve-Path -LiteralPath $IllustratorPath).ProviderPath
    }
    $seen = @{}
    foreach ($candidate in ($candidates | Where-Object { $_ } | Select-Object -Unique)) {
        $location = [Environment]::ExpandEnvironmentVariables($candidate.Trim().Trim('"'))
        if (-not [IO.Path]::IsPathRooted($location)) { continue }
        $appPaths = if ($location -match '\\Illustrator\.exe$') { $location } else {
            (Join-Path $location $appRelative), (Join-Path $location 'Illustrator.exe')
        }
        $exe = Get-Item -LiteralPath $appPaths -ErrorAction SilentlyContinue | Where-Object { -not $_.PSIsContainer } | Select-Object -First 1
        if (-not $exe -or $seen.ContainsKey($exe.FullName)) { continue }
        $seen[$exe.FullName] = $true

        $cepPaths = foreach ($relative in 'PlugPlugOwl.dll','CEPHtmlEngine\CEPHtmlEngine.exe','CEPHtmlEngine.exe') {
            Join-Path $exe.DirectoryName $relative
        }
        $cep = Get-Item -LiteralPath $cepPaths -ErrorAction SilentlyContinue |
            Where-Object { -not $_.PSIsContainer -and $_.VersionInfo.FileMajorPart -gt 0 } | Select-Object -First 1
        [pscustomobject]@{
            Path = $exe.FullName
            Version = $exe.VersionInfo.ProductVersion
            Major = $exe.VersionInfo.ProductMajorPart
            CepVersion = if ($cep) { $cep.VersionInfo.FileVersion } else { 'Khong xac dinh' }
            CepMajor = if ($cep) { $cep.VersionInfo.FileMajorPart } else { 0 }
        }
    }
}

$installLock = $null
try {
    if (-not $CheckOnly) {
        New-Item -ItemType Directory -Path $userState -Force | Out-Null
        if ($Action -ne 'Diagnose') {
            try {
                $installLock = [IO.File]::Open((Join-Path $userState 'install.lock'), 'OpenOrCreate', 'ReadWrite', 'None')
            } catch [IO.IOException] {
                throw 'Khong the khoa bo cai. Hay dong cac bo cai toolkit khac va thu lai.'
            }
        }
    }
    Write-Log "Thu muc extension: $target"
    Write-Log "Nhat ky: $log"
    $installed = Get-Item -LiteralPath $target -Force -ErrorAction SilentlyContinue
    if ($installed -and (-not $installed.PSIsContainer -or ($installed.Attributes -band [IO.FileAttributes]::ReparsePoint))) {
        throw 'Thu muc extension dich khong phai thu muc thuong.'
    }
    if ($Action -eq 'Uninstall') {
        if ($CheckOnly) { exit 0 }
        if ($installed) {
            [xml]$identity = Get-Content -LiteralPath (Join-Path $target 'CSXS\manifest.xml') -Raw -Encoding UTF8
            if ($identity.ExtensionManifest.ExtensionBundleId -cne $id) { throw 'ID trong manifest khong khop extension can go.' }
            $resolved = (Resolve-Path -LiteralPath $target).ProviderPath
            if ([IO.Path]::GetFullPath($resolved) -ne $target) { throw 'Thu muc go khong khop dich.' }
            Remove-Item -LiteralPath $resolved -Recurse -Force
            Write-Log 'Da go extension.'
        } else { Write-Log 'Extension chua duoc cai.' }
        Write-Log 'Da giu preset trong profile CEP va thiet lap CSXS dung chung.'
        exit 0
    }

    $packageRoot = $project
    if (-not (Test-Path -LiteralPath (Join-Path $packageRoot $id))) { $packageRoot = Join-Path $project "build\$release" }
    $jsx = Join-Path $packageRoot 'EVENT_DESIGN_TOOLKIT.jsx'
    $hosts = @(Find-Illustrator)
    foreach ($hostInfo in $hosts) {
        $route = if ($hostInfo.Major -ge $minHostMajor -and $hostInfo.CepMajor -ge $minCepMajor) { 'Panel CEP' } else { 'Kiem tra ban JSX' }
        Write-Log "ILST $($hostInfo.Version) / CEP $($hostInfo.CepVersion) / $route - $($hostInfo.Path)"
    }
    $cepMajors = @($hosts | Where-Object { $_.Major -ge $minHostMajor -and $_.CepMajor -ge $minCepMajor } |
        Select-Object -ExpandProperty CepMajor | Sort-Object -Unique)
    if (-not $cepMajors.Count) {
        Write-Log "Khong phat hien Illustrator $minHostMajor.0 tro len co CEP $minCepMajor tro len. Bo cai se bo qua panel."
    }
    Write-Log "Ban JSX (CS5 tro len): File > Scripts > Other Script > $jsx"

    if ($Action -eq 'Diagnose') {
        if ($installed) {
            $body = Read-Extension $target
            Write-Log "Panel da cai: $($body.ExtensionBundleVersion), ILST $($body.ExecutionEnvironment.HostList.Host.Version), CSXS $($body.ExecutionEnvironment.RequiredRuntimeList.RequiredRuntime.Version)."
        } else { Write-Log 'Chua tim thay extension tai thu muc dich.' }
        foreach ($major in $cepMajors) {
            $mode = Get-ItemProperty -LiteralPath (Get-DebugKey $major) -Name PlayerDebugMode -ErrorAction SilentlyContinue
            Write-Log "CSXS.$major PlayerDebugMode: $($mode.PlayerDebugMode)"
        }
        $cepLogs = Get-ChildItem -LiteralPath $env:TEMP -File -ErrorAction SilentlyContinue |
            Where-Object Name -Match '^(CEP|CSXS|PlugPlug).*(\.log|\.txt)$' |
            Sort-Object LastWriteTime -Descending | Select-Object -First 12
        foreach ($entry in $cepLogs) { Write-Log "CEP log: $($entry.FullName)" }
        if ($cepMajors.Count) { Write-Log 'Khoi dong lai Illustrator va chon Window > Extensions > EVENT DESIGN TOOLKIT.' }
        exit 0
    }

    $package = Join-Path $packageRoot $id
    Assert-Package $package
    if (-not (Test-Path -LiteralPath $jsx -PathType Leaf)) {
        throw 'Thieu tep EVENT_DESIGN_TOOLKIT.jsx trong goi cai.'
    }
    Write-Log "Goi hop le: $package"
    if ($CheckOnly -or -not $cepMajors.Count) { exit 0 }
    if (Get-Process Illustrator -ErrorAction SilentlyContinue) {
        throw 'Hay dong Illustrator roi chay lai bo cai.'
    }
    $stamp = (Get-Date -Format yyyyMMdd-HHmmssfff) + '-' + [Guid]::NewGuid().ToString('N').Substring(0,8)
    $backup = Join-Path $userState "backup-$stamp"
    $stage = Join-Path $userState "stage-$stamp"
    $interrupted = Join-Path $userState "interrupted-$stamp"
    Copy-Item -LiteralPath $package -Destination $stage -Recurse
    Assert-Package $stage
    New-Item -ItemType Directory -Path $extensionRoot -Force | Out-Null
    $savedOld = $false
    $movedNew = $false
    $changedModes = @()
    try {
        if ($installed) {
            Move-Item -LiteralPath $target -Destination $backup
            $savedOld = $true
            Write-Log "Sao luu: $backup"
        }
        Move-Item -LiteralPath $stage -Destination $target
        $movedNew = $true
        foreach ($major in $cepMajors) {
            $debugKey = Get-DebugKey $major
            $key = Get-Item -LiteralPath $debugKey -ErrorAction SilentlyContinue
            $oldKind = $null
            $oldValue = $null
            if ($key -and $key.GetValueNames() -contains 'PlayerDebugMode') {
                $oldKind = $key.GetValueKind('PlayerDebugMode')
                $oldValue = $key.GetValue('PlayerDebugMode', $null, 'DoNotExpandEnvironmentNames')
            }
            if ($oldKind -eq 'String' -and $oldValue -ceq '1') { continue }
            if (-not $key) {
                New-Item -Path $debugKey | Out-Null
            }
            New-ItemProperty -LiteralPath $debugKey -Name PlayerDebugMode -PropertyType String -Value '1' -Force | Out-Null
            $changedModes += [pscustomobject]@{ Path = $debugKey; Kind = $oldKind; Value = $oldValue }
        }
    } catch {
        foreach ($mode in $changedModes) {
            try {
                if ($null -eq $mode.Kind) {
                    Remove-ItemProperty -LiteralPath $mode.Path -Name PlayerDebugMode
                } else {
                    New-ItemProperty -LiteralPath $mode.Path -Name PlayerDebugMode -PropertyType $mode.Kind -Value $mode.Value -Force | Out-Null
                }
            } catch { Write-Warning "Khong khoi phuc duoc PlayerDebugMode: $($mode.Path)" }
        }
        if ($movedNew) { Move-Item -LiteralPath $target -Destination $interrupted }
        if ($savedOld) { Move-Item -LiteralPath $backup -Destination $target }
        throw
    }
    Write-Log "Da bat PlayerDebugMode cho CEP: $($cepMajors -join ', ')."
    Write-Log 'Cai dat xong. Mo tai lieu Illustrator, chon Window > Extensions > EVENT DESIGN TOOLKIT.'
    exit 0
} catch {
    Write-Log "LOI: $($_.Exception.Message)"
    exit 1
} finally {
    if ($installLock) { $installLock.Dispose() }
}
