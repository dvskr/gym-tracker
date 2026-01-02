# Replace Console Logs with Logger
# Run from gym-tracker directory: .\scripts\replace-console-logs.ps1

Write-Host "Replacing console.log with logger.log..." -ForegroundColor Cyan
Write-Host ""

$directories = @("app", "lib", "stores", "components", "hooks")
$totalFilesProcessed = 0
$totalReplacements = 0

foreach ($dir in $directories) {
    if (Test-Path $dir) {
        Write-Host "Processing $dir/..." -ForegroundColor Yellow
        
        $files = Get-ChildItem -Path $dir -Recurse -Include *.ts,*.tsx -File
        
        foreach ($file in $files) {
            $content = Get-Content $file.FullName -Raw -ErrorAction SilentlyContinue
            
            if ($null -eq $content) { continue }
            
            # Check if file has console statements
            if ($content -match "console\.(log|warn|error|info)") {
                $totalFilesProcessed++
                Write-Host "  Updating: $($file.Name)" -ForegroundColor Gray
                
                # Add import if not present
                if ($content -notmatch "import.*logger.*from") {
                    $loggerImport = 'import { logger } from ' + "'@/lib/utils/logger';"
                    
                    # Add after last import or at beginning
                    if ($content -match "^import") {
                        $content = $content -replace "(^import.*`n)+", "`$0$loggerImport`n"
                    } else {
                        $content = "$loggerImport`n$content"
                    }
                }
                
                # Count replacements
                $replacements = 0
                $replacements += ([regex]::Matches($content, "console\.log\(")).Count
                $replacements += ([regex]::Matches($content, "console\.warn\(")).Count
                $replacements += ([regex]::Matches($content, "console\.error\(")).Count
                $replacements += ([regex]::Matches($content, "console\.info\(")).Count
                $totalReplacements += $replacements
                
                # Replace
                $content = $content -replace "console\.log\(", "logger.log("
                $content = $content -replace "console\.warn\(", "logger.warn("
                $content = $content -replace "console\.error\(", "logger.error("
                $content = $content -replace "console\.info\(", "logger.info("
                
                # Write back
                [System.IO.File]::WriteAllText($file.FullName, $content)
            }
        }
        Write-Host ""
    }
}

Write-Host "========================================" -ForegroundColor Green
Write-Host "Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "Files Updated:      $totalFilesProcessed" -ForegroundColor White
Write-Host "Total Replacements: $totalReplacements" -ForegroundColor White
