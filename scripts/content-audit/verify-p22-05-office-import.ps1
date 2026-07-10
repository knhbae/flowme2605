param(
  [string]$PackageId = '2026-07-11-claude-design-p22-05-external-import-evidence'
)

$ErrorActionPreference = 'Stop'
$packageDir = (Resolve-Path (Join-Path 'docs/content-audit' $PackageId)).Path
$manifestPath = Join-Path $packageDir 'fixture-manifest.json'
$manifest = Get-Content -Raw -Encoding utf8 $manifestPath | ConvertFrom-Json
$preExistingExcelProcessIds = @(Get-Process EXCEL -ErrorAction SilentlyContinue | ForEach-Object { $_.Id })
$preExistingWordProcessIds = @(Get-Process WINWORD -ErrorAction SilentlyContinue | ForEach-Object { $_.Id })

function Release-ComObject([object]$Value) {
  if ($null -ne $Value -and [Runtime.InteropServices.Marshal]::IsComObject($Value)) {
    [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($Value)
  }
}

$excelObservations = @()
$excel = $null
try {
  $excel = New-Object -ComObject Excel.Application
  $excel.Visible = $false
  $excel.DisplayAlerts = $false

  foreach ($flow in $manifest.representativeFlows) {
    $workbook = $null
    $executionSheet = $null
    $usedRange = $null
    try {
      $xlsxPath = Join-Path $packageDir $flow.files.sheet
      $workbook = $excel.Workbooks.Open($xlsxPath, 0, $true)
      $sheetNames = @()
      for ($index = 1; $index -le $workbook.Worksheets.Count; $index += 1) {
        $sheet = $workbook.Worksheets.Item($index)
        $sheetNames += [string]($sheet.Name)
        Release-ComObject $sheet
      }
      $executionSheet = $workbook.Worksheets.Item('실행표')
      $usedRange = $executionSheet.UsedRange
      $matchingRow = 0
      for ($row = 2; $row -le $usedRange.Rows.Count; $row += 1) {
        $memoCell = $executionSheet.Cells.Item($row, 8)
        $memoValue = [string]($memoCell.Text)
        Release-ComObject $memoCell
        if ($memoValue -eq [string]($flow.firstItem.memo)) {
          $matchingRow = $row
          break
        }
      }

      $observedTitle = ''
      $observedDate = ''
      if ($matchingRow) {
        $titleCell = $executionSheet.Cells.Item($matchingRow, 5)
        $dateCell = $executionSheet.Cells.Item($matchingRow, 3)
        $observedTitle = [string]($titleCell.Text)
        $observedDate = [string]($dateCell.Text)
        Release-ComObject $titleCell
        Release-ComObject $dateCell
      }
      $excelObservations += [ordered]@{
        id = [string]($flow.id);
        application = 'Microsoft Excel'
        openedReadOnly = [bool]($workbook.ReadOnly)
        sheetNames = $sheetNames
        executionDataRowCount = [int]($usedRange.Rows.Count) - 1
        expectedExecutionDataRowCount = [int]($flow.expectedExecutionRowCount)
        matchingMemoRow = $matchingRow
        observedTitle = $observedTitle
        expectedTitle = [string]($flow.firstItem.title)
        observedDate = $observedDate
        expectedDate = [string]($flow.firstItem.expectedDate)
        titleFidelity = $observedTitle -eq [string]($flow.firstItem.title)
        dateFidelity = $observedDate -eq [string]($flow.firstItem.expectedDate)
        memoFidelity = $matchingRow -gt 0
      }
    }
    finally {
      if ($null -ne $workbook) { $workbook.Close($false) }
      Release-ComObject $usedRange
      Release-ComObject $executionSheet
      Release-ComObject $workbook
    }
  }
}
finally {
  if ($null -ne $excel) { $excel.Quit() }
  Release-ComObject $excel
  [GC]::Collect()
  [GC]::WaitForPendingFinalizers()
  Get-Process EXCEL -ErrorAction SilentlyContinue |
    Where-Object { $preExistingExcelProcessIds -notcontains $_.Id -and -not $_.MainWindowTitle } |
    Stop-Process -Force
}

$memoObservations = @()
$word = $null
try {
  $word = New-Object -ComObject Word.Application
  $word.Visible = $false
  $word.DisplayAlerts = 0

  foreach ($flow in $manifest.representativeFlows) {
    $document = $null
    $content = $null
    try {
      $memoPath = Join-Path $packageDir $flow.files.memo
      $document = $word.Documents.Open($memoPath, $false, $true)
      $content = $document.Content
      $text = [string]($content.Text)
      $memoObservations += [ordered]@{
        id = [string]($flow.id)
        application = 'Microsoft Word'
        openedReadOnly = [bool]($document.ReadOnly)
        characterCount = $text.Length
        titleFidelity = $text.Contains([string]($flow.firstItem.title))
        memoFidelity = $text.Contains([string]($flow.firstItem.memo))
        brokenDescriptionLabelCount = ([regex]::Matches($text, '\?\?:')).Count
      }
    }
    finally {
      if ($null -ne $document) { $document.Close($false) }
      Release-ComObject $content
      Release-ComObject $document
    }
  }
}
finally {
  if ($null -ne $word) { $word.Quit() }
  Release-ComObject $word
  [GC]::Collect()
  [GC]::WaitForPendingFinalizers()
  Get-Process WINWORD -ErrorAction SilentlyContinue |
    Where-Object { $preExistingWordProcessIds -notcontains $_.Id -and -not $_.MainWindowTitle } |
    Stop-Process -Force
}

$calendarProjection = @(
  $manifest.representativeFlows | ForEach-Object {
    [ordered]@{
      id = [string]($_.id)
      expectedEventCount = [int]($_.expectedEventCount)
      titleProjectionPresent = @($_.expectedFields.calendarSubjects).Count -eq [int]($_.expectedEventCount)
      dateProjectionPresent = @($_.expectedFields.calendarDates).Count -eq [int]($_.expectedEventCount)
      memoProjectionPresent = [bool]($_.expectedFields.calendarContainsUserMemo)
      stableUidOnRegeneration = [bool]($_.regeneration.calendarUidSetStable)
    }
  }
)

function Invoke-OutlookProbe([string]$Path) {
  $processIdsBeforeProbe = @(Get-Process OUTLOOK -ErrorAction SilentlyContinue | ForEach-Object { $_.Id })
  $outlookJob = Start-Job -ArgumentList $Path -ScriptBlock {
    param($Path)
    $outlook = $null
    $namespace = $null
    $firstItem = $null
    $secondItem = $null
    try {
      $outlook = New-Object -ComObject Outlook.Application
      $namespace = $outlook.GetNamespace('MAPI')
      $firstItem = $namespace.OpenSharedItem($Path)
      $secondItem = $namespace.OpenSharedItem($Path)
      [ordered]@{
        status = 'opened'
        subject = [string]($firstItem.Subject)
        start = ([datetime]$firstItem.Start).ToString('yyyy-MM-dd HH:mm')
        memoFidelity = ([string]$firstItem.Body).Contains('오전 중 견적 후보 두 곳에 연락하고 포함 범위를 확인')
        stableGlobalAppointmentId = [string]($firstItem.GlobalAppointmentID) -eq [string]($secondItem.GlobalAppointmentID)
        defaultCalendarWritePerformed = $false
      }
    }
    catch {
      [ordered]@{
        status = 'failed'
        pathExists = Test-Path $Path
        hresult = '0x{0:X8}' -f ($_.Exception.HResult -band 0xffffffffL)
        reason = $_.Exception.Message
        defaultCalendarWritePerformed = $false
      }
    }
    finally {
      if ($null -ne $secondItem) { $secondItem.Close(1) }
      if ($null -ne $firstItem) { $firstItem.Close(1) }
      foreach ($value in @($secondItem, $firstItem, $namespace, $outlook)) {
        if ($null -ne $value -and [Runtime.InteropServices.Marshal]::IsComObject($value)) {
          [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($value)
        }
      }
      [GC]::Collect()
      [GC]::WaitForPendingFinalizers()
    }
  }

  $completedJob = Wait-Job -Job $outlookJob -Timeout 20
  if ($null -ne $completedJob) {
    $received = Receive-Job -Job $outlookJob
    if ($received.status -eq 'opened') {
      $probeResult = [ordered]@{
        status = [string]($received.status)
        subject = [string]($received.subject)
        start = [string]($received.start)
        memoFidelity = [bool]($received.memoFidelity)
        stableGlobalAppointmentId = [bool]($received.stableGlobalAppointmentId)
        defaultCalendarWritePerformed = $false
      }
    }
    else {
      $probeResult = [ordered]@{
        status = [string]($received.status)
        pathExists = [bool]($received.pathExists)
        hresult = [string]($received.hresult)
        reason = [string]($received.reason)
        defaultCalendarWritePerformed = $false
      }
    }
  }
  else {
    Stop-Job -Job $outlookJob
    $probeResult = [ordered]@{
      status = 'blocked'
      reason = 'local Outlook profile or first-run initialization did not complete within 20 seconds'
      defaultCalendarWritePerformed = $false
    }
  }
  Remove-Job -Job $outlookJob -Force

  Get-Process OUTLOOK -ErrorAction SilentlyContinue |
    Where-Object { $processIdsBeforeProbe -notcontains $_.Id -and -not $_.MainWindowTitle } |
    Stop-Process -Force -ErrorAction SilentlyContinue
  return $probeResult
}

$preExistingOutlookProcessIds = @(Get-Process OUTLOOK -ErrorAction SilentlyContinue | ForEach-Object { $_.Id })
if ($preExistingOutlookProcessIds.Count -gt 0) {
  $outlookObservation = [ordered]@{
    application = 'Microsoft Outlook'
    status = 'skipped'
    reason = 'pre-existing Outlook process; automated probe skipped to avoid changing a user session'
    defaultCalendarWritePerformed = $false
  }
}
else {
  $calendarProbePath = Join-Path $env:TEMP 'flowme-p22-outlook-probe.ics'
  $calendarControlPath = Join-Path $env:TEMP 'flowme-p22-outlook-control.ics'
  $calendarSourcePath = Join-Path $packageDir $manifest.representativeFlows[0].files.calendarFirstEvent
  Copy-Item -LiteralPath $calendarSourcePath -Destination $calendarProbePath -Force
  $controlIcs = "BEGIN:VCALENDAR`r`nVERSION:2.0`r`nPRODID:-//FlowMe//P22 Control//EN`r`nCALSCALE:GREGORIAN`r`nMETHOD:PUBLISH`r`nBEGIN:VEVENT`r`nUID:flowme-p22-control@flowme.local`r`nDTSTAMP:20260711T000000Z`r`nDTSTART:20260727T090000`r`nDTEND:20260727T100000`r`nSUMMARY:FlowMe P22 Control`r`nDESCRIPTION:Import control`r`nSTATUS:CONFIRMED`r`nTRANSP:OPAQUE`r`nEND:VEVENT`r`nEND:VCALENDAR`r`n"
  [IO.File]::WriteAllText($calendarControlPath, $controlIcs, [Text.Encoding]::ASCII)
  $generatedProbe = Invoke-OutlookProbe $calendarProbePath
  $controlProbe = Invoke-OutlookProbe $calendarControlPath

  if ($generatedProbe.status -eq 'opened') {
    $outlookObservation = [ordered]@{
      application = 'Microsoft Outlook'
      status = 'opened'
      generatedFixture = $generatedProbe
      minimalControl = $controlProbe
      defaultCalendarWritePerformed = $false
    }
  }
  elseif ($controlProbe.status -eq 'opened') {
    $outlookObservation = [ordered]@{
      application = 'Microsoft Outlook'
      status = 'failed'
      reason = 'Outlook opened the minimal control but rejected the generated fixture'
      generatedFixture = $generatedProbe
      minimalControl = $controlProbe
      defaultCalendarWritePerformed = $false
    }
  }
  else {
    $outlookObservation = [ordered]@{
      application = 'Microsoft Outlook'
      status = 'blocked'
      reason = 'Outlook rejected both a minimal control and the generated fixture; local MAPI profile import is unavailable'
      generatedFixture = $generatedProbe
      minimalControl = $controlProbe
      defaultCalendarWritePerformed = $false
    }
  }
  Remove-Item -LiteralPath $calendarProbePath, $calendarControlPath -ErrorAction SilentlyContinue
}

$excelPassCount = @(
  $excelObservations | Where-Object {
    $_.openedReadOnly -and $_.titleFidelity -and $_.dateFidelity -and $_.memoFidelity
  }
).Count
$memoPassCount = @(
  $memoObservations | Where-Object {
    $_.openedReadOnly -and $_.titleFidelity -and $_.memoFidelity -and $_.brokenDescriptionLabelCount -eq 0
  }
).Count
$calendarProjectionPassCount = @(
  $calendarProjection | Where-Object {
    $_.titleProjectionPresent -and $_.dateProjectionPresent -and $_.memoProjectionPresent -and $_.stableUidOnRegeneration
  }
).Count

$observation = [ordered]@{
  packageId = $PackageId
  observedAt = '2026-07-11'
  environment = [ordered]@{
    excelVersion = (Get-Item 'C:\Program Files\Microsoft Office\root\Office16\EXCEL.EXE').VersionInfo.FileVersion
    wordVersion = (Get-Item 'C:\Program Files\Microsoft Office\root\Office16\WINWORD.EXE').VersionInfo.FileVersion
    outlookVersion = (Get-Item 'C:\Program Files\Microsoft Office\root\Office16\OUTLOOK.EXE').VersionInfo.FileVersion
  }
  excel = $excelObservations
  memo = $memoObservations
  calendarPayloadProjection = $calendarProjection
  outlook = $outlookObservation
  duplicatePolicy = [ordered]@{
    calendar = '같은 Flow 재생성은 UID를 유지한다. 외부 캘린더의 중복 병합은 보장하지 않으므로 다시 가져오기 전에 이전 전용 캘린더를 지우거나 새 전용 캘린더에 가져온다.'
    spreadsheet = '재생성 파일로 기존 파일을 교체한다. 기존 시트에 다시 붙이면 중복될 수 있다.'
    memo = '기존 문서 블록을 새 내보내기 내용으로 교체한다. 같은 문서에 반복해서 붙이지 않는다.'
  }
  recoveryCopy = [ordered]@{
    calendar = '가져오기가 안 되면 캘린더 앱의 가져오기 메뉴에서 .ics 파일을 직접 선택하세요. 다시 가져올 때는 이전에 만든 Flow 캘린더를 먼저 지워 중복을 피하세요.'
    spreadsheet = '파일이 열리지 않으면 다운로드한 .xlsx 파일을 Excel에서 직접 여세요. 다시 받았다면 이전 파일 대신 새 파일을 사용하세요.'
    memo = '문서가 깨져 보이면 UTF-8로 다시 열고, 기존 내용에 덧붙이지 말고 새 내용으로 교체하세요.'
  }
  summary = [ordered]@{
    representativeFlowCount = [int]($manifest.representativeFlowCount)
    excelReadOnlyImportPassCount = $excelPassCount
    memoReadOnlyImportPassCount = $memoPassCount
    calendarPayloadProjectionPassCount = $calendarProjectionPassCount
    calendarExternalImportObserved = $outlookObservation.status -eq 'opened'
    calendarExternalImportBlocked = $outlookObservation.status -in @('blocked', 'failed', 'skipped')
    defaultCalendarWritePerformed = $false
    duplicatePolicyDocumented = $true
    recoveryCopyDocumented = $true
  }
}

$observationPath = Join-Path $packageDir 'office-observation.json'
$observation | ConvertTo-Json -Depth 12 | Set-Content -Encoding utf8 $observationPath
$observation.summary | ConvertTo-Json -Depth 4
