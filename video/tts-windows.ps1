# Generates narration WAV files with the Windows OneCore voices (Indian English by default).
# Usage: powershell -ExecutionPolicy Bypass -File tts-windows.ps1 -Script explainer/script.json -Out public/narration
param(
  [string]$Script = "explainer/script.json",
  [string]$Out = "public/narration",
  [string]$Voice = "Heera"
)
$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Runtime.WindowsRuntime
[void][Windows.Media.SpeechSynthesis.SpeechSynthesizer, Windows.Media.SpeechSynthesis, ContentType = WindowsRuntime]
[void][Windows.Storage.Streams.DataReader, Windows.Storage.Streams, ContentType = WindowsRuntime]

$asTask = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
  $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1'
} | Select-Object -First 1
function Await($op, [Type]$type) {
  $task = $asTask.MakeGenericMethod($type).Invoke($null, @($op))
  $task.Wait() | Out-Null
  $task.Result
}

$synth = New-Object Windows.Media.SpeechSynthesis.SpeechSynthesizer
$chosen = [Windows.Media.SpeechSynthesis.SpeechSynthesizer]::AllVoices | Where-Object { $_.DisplayName -like "*$Voice*" } | Select-Object -First 1
if (-not $chosen) { throw "Voice '$Voice' not installed" }
$synth.Voice = $chosen
$synth.Options.SpeakingRate = 1.35

New-Item -ItemType Directory -Force $Out | Out-Null
$scenes = Get-Content $Script -Raw -Encoding UTF8 | ConvertFrom-Json
foreach ($scene in $scenes) {
  $stream = Await ($synth.SynthesizeTextToStreamAsync($scene.narration)) ([Windows.Media.SpeechSynthesis.SpeechSynthesisStream])
  $reader = New-Object Windows.Storage.Streams.DataReader($stream.GetInputStreamAt(0))
  $size = [uint32]$stream.Size
  [void](Await ($reader.LoadAsync($size)) ([uint32]))
  $bytes = New-Object byte[] $size
  $reader.ReadBytes($bytes)
  [System.IO.File]::WriteAllBytes((Join-Path (Resolve-Path $Out) ($scene.id + ".wav")), $bytes)
  Write-Output ("{0}`t{1}" -f $scene.id, $size)
}


