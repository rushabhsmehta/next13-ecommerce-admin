# Move old documentation files to archive
# This script preserves README.md, LICENSE, and SECURITY.md in root

$rootPath = "c:\Users\HP\Documents\GitHub\next13-ecommerce-admin"
$archivePath = "$rootPath\docs\archive"

# Files to keep in root (don't move these)
$keepInRoot = @(
    "README.md",
    "LICENSE",
    "SECURITY.md",
    "schema.prisma",
    "prisma-social-media-schema.md"  # Prisma-specific, keep for reference
)

# Get all MD files in root
$mdFiles = Get-ChildItem -Path $rootPath -Filter "*.md" -File

Write-Host "Found $($mdFiles.Count) MD files in root" -ForegroundColor Cyan
Write-Host "Moving old documentation files to archive..." -ForegroundColor Yellow
Write-Host ""

$movedCount = 0
$keptCount = 0

foreach ($file in $mdFiles) {
    if ($keepInRoot -contains $file.Name) {
        Write-Host "  KEEP: $($file.Name)" -ForegroundColor Green
        $keptCount++
    }
    else {
        try {
            Move-Item -Path $file.FullName -Destination $archivePath -Force
            Write-Host "  MOVE: $($file.Name)" -ForegroundColor Gray
            $movedCount++
        }
        catch {
            Write-Host "  ERROR moving $($file.Name): $_" -ForegroundColor Red
        }
    }
}

Write-Host ""
Write-Host "===== Summary =====" -ForegroundColor Cyan
Write-Host "Total files processed: $($mdFiles.Count)" -ForegroundColor White
Write-Host "Files moved to archive: $movedCount" -ForegroundColor Yellow
Write-Host "Files kept in root: $keptCount" -ForegroundColor Green
Write-Host ""
Write-Host "Archive location: $archivePath" -ForegroundColor Cyan
Write-Host "New docs structure: $rootPath\docs\" -ForegroundColor Cyan
