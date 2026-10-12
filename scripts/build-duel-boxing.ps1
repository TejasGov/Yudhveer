<#
Builds the duel's boxing training hero through the existing character pipeline (PowerShell 7). Originals remain outside the
repository, and the campaign GLBs are never output targets. Mixamo clips are Binary FBX, Without Skin, 30 fps,
no keyframe reduction; boxing_jab_right alone is mirrored. Keep sources.json beside them as the download receipt.
The staging folder holds copied animation inputs and Blender temporary files. Run from anywhere; this script
only writes staging and the two named duel assets. See docs/PVP.md for timing choices and verification.
#>
param(
    [string]$Sources = 'E:\hindan\pvp-boxing-sources',
    [string]$CharacterSources = 'E:\hindan\game asset\characters',
    [string]$Staging = 'E:\hindan\pvp-boxing-build',
    [string]$Blender = 'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe'
)
$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $PSScriptRoot
$clips = @('boxing_jab_right', 'boxing_cross', 'boxing_hook', 'boxing_idle', 'boxing_walk', 'boxing_run',
    'boxing_body_hit', 'boxing_recoil', 'boxing_knockout')
foreach ($clip in $clips) {
    if (!(Test-Path -LiteralPath (Join-Path $Sources "$clip.fbx"))) { throw "Missing source: $clip.fbx" }
}
$receipt = Get-Content -LiteralPath (Join-Path $repo 'docs\PVP_BOXING_SOURCES.json') -Raw | ConvertFrom-Json
foreach ($clip in $clips) {
    $expected = $receipt.clips | Where-Object { $_.file -eq "$clip.fbx" }
    $actual = (Get-FileHash -LiteralPath (Join-Path $Sources "$clip.fbx") -Algorithm SHA256).Hash.ToLower()
    if (!$expected -or $actual -ne $expected.sha256) { throw "Source receipt mismatch: $clip.fbx" }
}
# Fresh inputs on each run avoid silently exporting a removed/stale clip from a previous staging directory.
$inputDir = Join-Path $Staging ('animations-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Force -Path $inputDir, (Join-Path $Staging 'temp') | Out-Null
Get-ChildItem -LiteralPath (Join-Path $CharacterSources 'animations') -Filter '*.fbx' |
    Where-Object { $_.Name -match '^(All-|Yodha-|Hero-)' -or $_.Name -eq 'Stance-Calm Idle.fbx' } |
    Copy-Item -Destination $inputDir
foreach ($clip in $clips) { Copy-Item -LiteralPath (Join-Path $Sources "$clip.fbx") -Destination $inputDir }
$glb = Join-Path $Staging 'yodha_duel_boxing.glb'
$manifest = Join-Path $Staging 'yodha_duel_boxing.manifest.json'
$oldTemp = $env:TEMP; $oldTmp = $env:TMP
try {
    $env:TEMP = Join-Path $Staging 'temp'; $env:TMP = $env:TEMP
    & $Blender -b --factory-startup --python-exit-code 1 --python (Join-Path $CharacterSources 'build_character.py') -- `
        (Join-Path $CharacterSources 'rigs\yodha_training.rigged.glb') $inputDir $glb `
        --prefixes 'All-,Yodha-,Hero-' --clips (($clips + 'calm_idle') -join ',') --fists `
        --finger-markers (Join-Path $CharacterSources 'rigs\yodha_training.fingers.json') `
        --post (Join-Path $CharacterSources 'yodha_post.py') --height 1.7
    if ($LASTEXITCODE -ne 0) { throw 'Character export failed' }
} finally { $env:TEMP = $oldTemp; $env:TMP = $oldTmp }
# Both empty hands close in the boxing guard; inherited prayer/slide clips retain their original hand policy.
$data = Get-Content -LiteralPath $manifest -Raw | ConvertFrom-Json -AsHashtable
foreach ($clip in $clips) { $data.clips[$clip].hands = 'fist' }
$json = ($data | ConvertTo-Json -Depth 100).Replace("`r`n", "`n").Replace("`n", "`r`n")
[IO.File]::WriteAllText($manifest, $json + "`r`n", [Text.UTF8Encoding]::new($false))
$destination = Join-Path $repo 'public\assets\characters'
Copy-Item -LiteralPath $glb, $manifest -Destination $destination
& node (Join-Path $PSScriptRoot 'pack-glb.mjs') (Join-Path $destination 'yodha_duel_boxing.glb') --check
if ($LASTEXITCODE -ne 0) { throw 'Packed animation verification failed' }
