Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Drawing

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$assetsDir = Join-Path (Split-Path -Parent $scriptDir) "assets"
$logoPath = Join-Path $assetsDir "logo-emblem-source.png"

if (-not (Test-Path -LiteralPath $assetsDir)) {
    New-Item -ItemType Directory -Path $assetsDir | Out-Null
}

function New-Canvas {
    param(
        [int]$Size,
        [System.Drawing.Color]$Background
    )

    $bmp = New-Object System.Drawing.Bitmap($Size, $Size)
    $gfx = [System.Drawing.Graphics]::FromImage($bmp)
    $gfx.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $gfx.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $gfx.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $gfx.Clear($Background)

    return @{ Bitmap = $bmp; Graphics = $gfx }
}

function New-RoundedRectPath {
    param(
        [float]$X,
        [float]$Y,
        [float]$Width,
        [float]$Height,
        [float]$Radius
    )

    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $diameter = $Radius * 2

    $path.AddArc($X, $Y, $diameter, $diameter, 180, 90)
    $path.AddArc($X + $Width - $diameter, $Y, $diameter, $diameter, 270, 90)
    $path.AddArc($X + $Width - $diameter, $Y + $Height - $diameter, $diameter, $diameter, 0, 90)
    $path.AddArc($X, $Y + $Height - $diameter, $diameter, $diameter, 90, 90)
    $path.CloseFigure()

    return $path
}

function Add-ClosedCurveFigure {
    param(
        [System.Drawing.Drawing2D.GraphicsPath]$Path,
        [System.Drawing.PointF[]]$Points
    )

    $Path.StartFigure()
    $Path.AddClosedCurve($Points)
    $Path.CloseFigure()
}

function New-PointF {
    param(
        [float]$X,
        [float]$Y
    )

    return [System.Drawing.PointF]::new($X, $Y)
}

function New-Point {
    param(
        [int]$X,
        [int]$Y
    )

    return [System.Drawing.Point]::new($X, $Y)
}

function Draw-TravelMark {
    param(
        [System.Drawing.Graphics]$Graphics,
        [int]$Size,
        [switch]$ForegroundOnly,
        [switch]$Monochrome
    )

    $white = [System.Drawing.Color]::FromArgb(255, 255, 255, 255)
    $warmLight = [System.Drawing.Color]::FromArgb(255, 255, 245, 238)
    $softOrange = [System.Drawing.Color]::FromArgb(255, 255, 201, 165)
    $softAmber = [System.Drawing.Color]::FromArgb(255, 250, 166, 26)
    $shadow = [System.Drawing.Color]::FromArgb(35, 18, 18, 18)
    $symbolColor = if ($Monochrome) { $white } else { $white }
    $accentColor = if ($Monochrome) { $white } else { $softOrange }
    $sunColor = if ($Monochrome) { $white } else { $softAmber }

    $center = $Size / 2.0
    $markSize = $Size * 0.58
    $markLeft = $center - ($markSize / 2.0)
    $markTop = $Size * 0.17

    if (-not $Monochrome -and -not $ForegroundOnly) {
        $shadowBrush = New-Object System.Drawing.SolidBrush($shadow)
        $Graphics.FillEllipse($shadowBrush, $center - ($Size * 0.19), $markTop + ($Size * 0.05), $Size * 0.38, $Size * 0.48)
        $shadowBrush.Dispose()
    }

    $pinPath = New-Object System.Drawing.Drawing2D.GraphicsPath
    Add-ClosedCurveFigure -Path $pinPath -Points @(
        (New-PointF -X $center -Y $markTop),
        (New-PointF -X ($markLeft + ($markSize * 0.90)) -Y ($markTop + ($markSize * 0.18))),
        (New-PointF -X ($markLeft + ($markSize * 0.80)) -Y ($markTop + ($markSize * 0.56))),
        (New-PointF -X $center -Y ($markTop + $markSize)),
        (New-PointF -X ($markLeft + ($markSize * 0.20)) -Y ($markTop + ($markSize * 0.56))),
        (New-PointF -X ($markLeft + ($markSize * 0.10)) -Y ($markTop + ($markSize * 0.18)))
    )

    $pinBrush = New-Object System.Drawing.SolidBrush($symbolColor)
    $Graphics.FillPath($pinBrush, $pinPath)

    $innerColor = if ($Monochrome) { [System.Drawing.Color]::Transparent } else { $warmLight }
    $innerBrush = New-Object System.Drawing.SolidBrush($innerColor)
    $innerSize = $markSize * 0.38
    $innerLeft = $center - ($innerSize / 2.0)
    $innerTop = $markTop + ($markSize * 0.18)
    if (-not $Monochrome) {
        $Graphics.FillEllipse($innerBrush, $innerLeft, $innerTop, $innerSize, $innerSize)
    }

    $trailPen = New-Object System.Drawing.Pen($accentColor, [Math]::Max(12, $Size * 0.03))
    $trailPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $trailPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $Graphics.DrawBezier(
        $trailPen,
        (New-PointF -X ($markLeft + ($markSize * 0.28)) -Y ($markTop + ($markSize * 0.42))),
        (New-PointF -X ($markLeft + ($markSize * 0.40)) -Y ($markTop + ($markSize * 0.28))),
        (New-PointF -X ($markLeft + ($markSize * 0.59)) -Y ($markTop + ($markSize * 0.28))),
        (New-PointF -X ($markLeft + ($markSize * 0.71)) -Y ($markTop + ($markSize * 0.42)))
    )

    $sunBrush = New-Object System.Drawing.SolidBrush($sunColor)
    $sunSize = $Size * 0.10
    $Graphics.FillEllipse($sunBrush, $center - ($sunSize / 2.0), $Size * 0.12, $sunSize, $sunSize)

    $wingPen = New-Object System.Drawing.Pen($symbolColor, [Math]::Max(12, $Size * 0.03))
    $wingPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $wingPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round

    $planeCx = $center
    $planeCy = $Size * 0.27
    $Graphics.DrawLine($wingPen, $planeCx - ($Size * 0.10), $planeCy + ($Size * 0.04), $planeCx, $planeCy - ($Size * 0.07))
    $Graphics.DrawLine($wingPen, $planeCx + ($Size * 0.10), $planeCy + ($Size * 0.04), $planeCx, $planeCy - ($Size * 0.07))
    $Graphics.DrawLine($wingPen, $planeCx, $planeCy - ($Size * 0.07), $planeCx, $planeCy + ($Size * 0.10))
    $Graphics.DrawLine($wingPen, $planeCx, $planeCy + ($Size * 0.05), $planeCx - ($Size * 0.05), $planeCy + ($Size * 0.12))
    $Graphics.DrawLine($wingPen, $planeCx, $planeCy + ($Size * 0.05), $planeCx + ($Size * 0.05), $planeCy + ($Size * 0.12))

    $pinBrush.Dispose()
    $pinPath.Dispose()
    $innerBrush.Dispose()
    $trailPen.Dispose()
    $sunBrush.Dispose()
    $wingPen.Dispose()
}

function Save-Png {
    param(
        [System.Drawing.Bitmap]$Bitmap,
        [string]$Path
    )

    $Bitmap.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
}

function New-MainIcon {
    $canvas = New-Canvas -Size 1024 -Background ([System.Drawing.Color]::Transparent)
    $bmp = $canvas.Bitmap
    $gfx = $canvas.Graphics

    $rect = New-RoundedRectPath -X 64 -Y 64 -Width 896 -Height 896 -Radius 220
    $grad = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        (New-Point -X 120 -Y 100),
        (New-Point -X 904 -Y 944),
        ([System.Drawing.Color]::FromArgb(255, 220, 38, 38)),
        ([System.Drawing.Color]::FromArgb(255, 249, 115, 22))
    )
    $gfx.FillPath($grad, $rect)

    $glowBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(34, 255, 255, 255))
    $gfx.FillEllipse($glowBrush, 160, 120, 640, 360)

    if (Test-Path -LiteralPath $logoPath) {
        $logo = [System.Drawing.Image]::FromFile($logoPath)
        $logoSize = 700
        $logoX = [int](($bmp.Width - $logoSize) / 2)
        $logoY = 118
        $gfx.DrawImage($logo, $logoX, $logoY, $logoSize, $logoSize)
        $logo.Dispose()
    } else {
        Draw-TravelMark -Graphics $gfx -Size 1024
    }

    Save-Png -Bitmap $bmp -Path (Join-Path $assetsDir "icon.png")

    $glowBrush.Dispose()
    $grad.Dispose()
    $rect.Dispose()
    $gfx.Dispose()
    $bmp.Dispose()
}

function New-PlayStoreIcon {
    $canvas = New-Canvas -Size 512 -Background ([System.Drawing.Color]::Transparent)
    $bmp = $canvas.Bitmap
    $gfx = $canvas.Graphics

    $grad = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        (New-Point -X 40 -Y 32),
        (New-Point -X 472 -Y 480),
        ([System.Drawing.Color]::FromArgb(255, 220, 38, 38)),
        ([System.Drawing.Color]::FromArgb(255, 249, 115, 22))
    )
    $gfx.FillRectangle($grad, 0, 0, 512, 512)

    $glowBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(28, 255, 255, 255))
    $gfx.FillEllipse($glowBrush, 64, 48, 320, 180)

    if (Test-Path -LiteralPath $logoPath) {
        $logo = [System.Drawing.Image]::FromFile($logoPath)
        $logoSize = 360
        $logoX = [int](($bmp.Width - $logoSize) / 2)
        $logoY = 68
        $gfx.DrawImage($logo, $logoX, $logoY, $logoSize, $logoSize)
        $logo.Dispose()
    } else {
        Draw-TravelMark -Graphics $gfx -Size 512
    }
    Save-Png -Bitmap $bmp -Path (Join-Path $assetsDir "play-store-icon-512.png")

    $glowBrush.Dispose()
    $grad.Dispose()
    $gfx.Dispose()
    $bmp.Dispose()
}

function New-AdaptiveForeground {
    $canvas = New-Canvas -Size 1024 -Background ([System.Drawing.Color]::Transparent)
    $bmp = $canvas.Bitmap
    $gfx = $canvas.Graphics

    if (Test-Path -LiteralPath $logoPath) {
        $logo = [System.Drawing.Image]::FromFile($logoPath)
        $logoSize = 760
        $logoX = [int](($bmp.Width - $logoSize) / 2)
        $logoY = 100
        $gfx.DrawImage($logo, $logoX, $logoY, $logoSize, $logoSize)
        $logo.Dispose()
    } else {
        Draw-TravelMark -Graphics $gfx -Size 1024 -ForegroundOnly
    }
    Save-Png -Bitmap $bmp -Path (Join-Path $assetsDir "adaptive-icon.png")

    $gfx.Dispose()
    $bmp.Dispose()
}

function New-Favicon {
    $srcPath = Join-Path $assetsDir "icon.png"
    $src = [System.Drawing.Image]::FromFile($srcPath)
    $bmp = New-Object System.Drawing.Bitmap(48, 48)
    $gfx = [System.Drawing.Graphics]::FromImage($bmp)
    $gfx.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $gfx.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $gfx.DrawImage($src, 0, 0, 48, 48)

    Save-Png -Bitmap $bmp -Path (Join-Path $assetsDir "favicon.png")

    $gfx.Dispose()
    $bmp.Dispose()
    $src.Dispose()
}

function New-NotificationIcon {
    $canvas = New-Canvas -Size 96 -Background ([System.Drawing.Color]::Transparent)
    $bmp = $canvas.Bitmap
    $gfx = $canvas.Graphics

    if (Test-Path -LiteralPath $logoPath) {
        $font = New-Object System.Drawing.Font("Arial", 62, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
        $brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
        $stringFormat = New-Object System.Drawing.StringFormat
        $stringFormat.Alignment = [System.Drawing.StringAlignment]::Center
        $stringFormat.LineAlignment = [System.Drawing.StringAlignment]::Center
        $gfx.DrawString("A", $font, $brush, [System.Drawing.RectangleF]::new(0, 2, 96, 92), $stringFormat)
        $stringFormat.Dispose()
        $brush.Dispose()
        $font.Dispose()
    } else {
        Draw-TravelMark -Graphics $gfx -Size 96 -ForegroundOnly -Monochrome
    }
    Save-Png -Bitmap $bmp -Path (Join-Path $assetsDir "notification-icon.png")

    $gfx.Dispose()
    $bmp.Dispose()
}

New-MainIcon
New-PlayStoreIcon
New-AdaptiveForeground
New-Favicon
New-NotificationIcon

Write-Host "Generated app assets in $assetsDir"
