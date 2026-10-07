[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
chcp 65001 > $null

function B64 ($str) {
    return [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String($str))
}

function Get-DownloadsFolder {
    $regPath = "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\User Shell Folders"
    $downloadsGuid = "{374DE290-123F-4565-9164-39C4925E467B}"
    
    $folder = (Get-ItemProperty -Path $regPath).$downloadsGuid
    if (-not $folder) {
        $folder = (Get-ItemProperty -Path $regPath)."{7D83EE9B-2244-4E70-B1A5-774182A0A931}"
    }
    
    if ($folder) {
        return [System.Environment]::ExpandEnvironmentVariables($folder)
    } else {
        return [System.IO.Path]::Combine($env:USERPROFILE, "Downloads")
    }
}

$downloadDir = Get-DownloadsFolder

if (-not (Test-Path $downloadDir)) {
    New-Item -ItemType Directory -Path $downloadDir -Force | Out-Null
}

$zh0  = B64 "6K+36YCJ5oup6K+t6KiA"
$zh1  = (B64 "6K+36L6T5YWl5pWw5a2X") + " (1-2) [" + (B64 "6buY6K6k") + " 1]"
$zh2  = B64 "PT09IOW/q+aNt+i9r+S7tuS4i+i9veWuieijheW3peWFtyA9PT0="
$zh3  = B64 "6K+36YCJ5oup5L2g6KaB5LiL6L295a6J6KOF55qE6L2v5Lu2Og=="
$zh4  = B64 "6K+36YCJ5oup5a6J6KOF5qih5byPIC0="
$zh5  = B64 "MS4g5pmu6YCa5a6J6KOFICjmiZPlvIDlronoo4XljIUs6Ieq6KGM6YCJ5oup5a6J6KOF5L2N572uKQ=="
$zh6  = B64 "Mi4g6Z2Z6buY5a6J6KOFICjlkI7lj7Doh6rliqjlronoo4Up"
$zh7  = B64 "MC4g6YCA5Ye6IC8gRXhpdA=="
$zh8  = B64 "5q2j5Zyo5LiL6L29"
$zh9  = B64 "5q2j5Zyo5omT5byA5a6J6KOF56iL5bqPLi4u"
$zh10 = B64 "5q2j5Zyo6Z2Z6buY5a6J6KOFLi4u"
$zh11 = B64 "5pON5L2c5a6M5oiQIQ=="
$zh12 = B64 "6L6T5YWl5peg5pWILg=="
$zh13 = B64 "5q2j5Zyo5omT5byA5Y6L57yp5YyFLi4u"

$str360FirstAid   = B64 "MzYwIEZpcnN0IEFpZCBLaXQgKDM2MOaApeaVkeeusSk="
$str360BrowserX32 = B64 "MzYwIFNlY3VyZSBCcm93c2VyIHgzMiAoMzYw5p6B6YCf5rWP6KeI5ZmoKQ=="
$str360BrowserX64 = B64 "MzYwIFNlY3VyZSBCcm93c2VyIHg2NCAoMzYw5p6B6YCf5rWP6KeI5ZmoKQ=="
$strHuorong       = B64 "SHVvcm9uZyBTZWN1cml0eSB4NjQgKOeBq+e7kuWuieWFqCk="

Clear-Host
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host " Select Language / $zh0" -ForegroundColor Yellow
Write-Host " 1. Chinese"
Write-Host " 2. English"
Write-Host "=========================================" -ForegroundColor Cyan
$langChoice = Read-Host "$zh1"
if (-not $langChoice) { $langChoice = "1" }

if ($langChoice -eq "2") {
    $txtTitle             = "=== Software Installation Hub ==="
    $txtSelectApp         = "Select the software you want to install:"
    $txtSelectMode        = "Select installation mode for"
    $txtModeManual        = "1. Manual Install (Open setup UI)"
    $txtModeSilent        = "2. Silent Install (Background install)"
    $txtBack              = "0. Exit"
    $txtDownloading       = "Downloading"
    $txtLaunching         = "Launching installer..."
    $txtOpeningZip        = "Opening archive..."
    $txtInstallingSilent  = "Executing silent installation..."
    $txtDone              = "Operation completed!"
    $txtInvalid           = "Invalid selection."
} else {
    $txtTitle             = $zh2
    $txtSelectApp         = $zh3
    $txtSelectMode        = $zh4
    $txtModeManual        = $zh5
    $txtModeSilent        = $zh6
    $txtBack              = $zh7
    $txtDownloading       = $zh8
    $txtLaunching         = $zh9
    $txtOpeningZip        = $zh13
    $txtInstallingSilent  = $zh10
    $txtDone              = $zh11
    $txtInvalid           = $zh12
}

$softwareList = @(
    @{ Id = "1"; Name = "Roblox Player"; RawUrl = "https://alist.legspcpd.top/d/Github/exe/RobloxPlayerInstaller.exe"; FileName = "RobloxPlayerInstaller.exe"; SilentArgs = ""; IsZip = $false },
    @{ Id = "2"; Name = "Firefox Installer (Online)"; RawUrl = "https://alist.legspcpd.top/d/Github/exe/Firefox%20Installer.exe"; FileName = "Firefox_Installer.exe"; SilentArgs = "-ms"; IsZip = $false },
    @{ Id = "3"; Name = "Firefox Setup 154.0 (Offline)"; RawUrl = "https://alist.legspcpd.top/d/Github/exe/Firefox%20Setup%20154.0.exe"; FileName = "Firefox_Setup_154.0.exe"; SilentArgs = "-ms"; IsZip = $false },
    @{ Id = "4"; Name = "ChatGPT Installer"; RawUrl = "https://alist.legspcpd.top/d/Github/exe/ChatGPT%20Installer.exe"; FileName = "ChatGPT_Installer.exe"; SilentArgs = "/S"; IsZip = $false },
    @{ Id = "5"; Name = "Google Chrome (Online)"; RawUrl = "https://alist.legspcpd.top/d/Github/ChromeSetup.exe"; FileName = "ChromeSetup.exe"; SilentArgs = "/silent /install"; IsZip = $false },
    @{ Id = "6"; Name = "Google Chrome (151.0 Offline)"; RawUrl = "https://alist.legspcpd.top/d/Github/exe/151.0.7922.174_chrome_installer_uncompressed.exe"; FileName = "chrome_installer_offline.exe"; SilentArgs = "/silent /install"; IsZip = $false },
    @{ Id = "7"; Name = "Old Outlook 2021 (Online)"; RawUrl = "https://alist.legspcpd.top/d/Github/exe/Old%20Outlook%202021.exe"; FileName = "Old_Outlook_2021.exe"; SilentArgs = ""; IsZip = $false },
    @{ Id = "8"; Name = "PotPlayer 64bit"; RawUrl = "https://alist.legspcpd.top/d/Github/exe/PotPlayerSetup64.exe"; FileName = "PotPlayerSetup64.exe"; SilentArgs = "/S"; IsZip = $false },
    @{ Id = "9"; Name = "Bandizip Pro 8.00 Beta 10 x64 Repack"; RawUrl = "https://alist.legspcpd.top/d/Github/exe/Bandizip-Pro-8.00-Beta-10-x64-Repack.exe"; FileName = "Bandizip-Pro-8.00-Beta-10-x64-Repack.exe"; SilentArgs = "/S"; IsZip = $false },
    @{ Id = "10"; Name = "Bandizip Professional 7.46 x64 Repack"; RawUrl = "https://alist.legspcpd.top/d/Github/exe/Bandizip-Professional-7.46-x64-Repack.exe"; FileName = "Bandizip-Professional-7.46-x64-Repack.exe"; SilentArgs = "/S"; IsZip = $false },
    @{ Id = "11"; Name = $str360FirstAid; RawUrl = "https://alist.legspcpd.top/d/Github/exe/360c0mpkill_5.1.64.1289-0701.zip"; FileName = "360c0mpkill.zip"; SilentArgs = ""; IsZip = $true },
    @{ Id = "12"; Name = $str360BrowserX32; RawUrl = "https://alist.legspcpd.top/d/Github/exe/360cse_23.0.1253.0.exe"; FileName = "360cse_x32.exe"; SilentArgs = "/S"; IsZip = $false },
    @{ Id = "13"; Name = $str360BrowserX64; RawUrl = "https://alist.legspcpd.top/d/Github/exe/360csex_23.1.1253.64.exe"; FileName = "360csex_x64.exe"; SilentArgs = "/S"; IsZip = $false },
    @{ Id = "14"; Name = $strHuorong; RawUrl = "https://alist.legspcpd.top/d/Github/exe/sysdiag-all-x64-6.0.11.2-2026.08.23.1.exe"; FileName = "Huorong_x64.exe"; SilentArgs = "/S"; IsZip = $false }
)

while ($true) {
    Clear-Host
    Write-Host $txtTitle -ForegroundColor Green
    Write-Host $txtSelectApp
    Write-Host "-----------------------------------------"
    
    foreach ($app in $softwareList) {
        Write-Host "$($app.Id). $($app.Name)"
    }
    Write-Host "0. Exit"
    Write-Host "-----------------------------------------"
    
    $selectedId = Read-Host "Input ID"
    if ($selectedId -eq "0") { break }
    
    $targetApp = $softwareList | Where-Object { $_.Id -eq $selectedId }
    
    if ($null -ne $targetApp) {
        Clear-Host
        Write-Host "$txtSelectMode [$($targetApp.Name)]" -ForegroundColor Yellow
        Write-Host "-----------------------------------------"
        Write-Host $txtModeManual
        Write-Host $txtModeSilent
        Write-Host $txtBack
        Write-Host "-----------------------------------------"
        
        $modeChoice = Read-Host "Input ID"
        if ($modeChoice -eq "0") { continue }
        
        $downloadUrl = $targetApp.RawUrl
        $targetPath = Join-Path $downloadDir $targetApp.FileName
        
        Write-Host "${txtDownloading}: $($targetApp.Name) ..." -ForegroundColor Cyan
        
        try {
            $userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            $curlPath = "$env:SystemRoot\System32\curl.exe"

            if (Test-Path $curlPath) {
                # 直接调用系统原生 curl.exe CLI 进行下载
                & $curlPath -fL -A $userAgent -o $targetPath $downloadUrl
                if ($LASTEXITCODE -ne 0) {
                    throw "curl.exe exited with code $LASTEXITCODE"
                }
            } else {
                Invoke-WebRequest -Uri $downloadUrl -OutFile $targetPath -UserAgent $userAgent -UseBasicParsing -ErrorAction Stop
            }
            
            if ($targetApp.IsZip -or $targetApp.FileName -match '\.(zip|7z|rar|tar|gz)$') {
                Write-Host $txtOpeningZip -ForegroundColor Green
                Invoke-Item -Path $targetPath
            } else {
                if ($modeChoice -eq "1") {
                    Write-Host $txtLaunching -ForegroundColor Green
                    Start-Process -FilePath $targetPath
                } 
                elseif ($modeChoice -eq "2") {
                    Write-Host $txtInstallingSilent -ForegroundColor Green
                    if ($targetApp.SilentArgs) {
                        Start-Process -FilePath $targetPath -ArgumentList $targetApp.SilentArgs -Wait
                    } else {
                        Start-Process -FilePath $targetPath -Wait
                    }
                    Write-Host $txtDone -ForegroundColor Green
                    Start-Sleep -Seconds 2
                }
            }
        } 
        catch {
            Write-Host "Error: $_" -ForegroundColor Red
            Pause
        }
    } 
    else {
        Write-Host $txtInvalid -ForegroundColor Red
        Start-Sleep -Seconds 1
    }
}