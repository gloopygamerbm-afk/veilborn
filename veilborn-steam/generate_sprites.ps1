Add-Type -AssemblyName System.Drawing

$imgPath = 'C:\Users\emili\.gemini\antigravity\brain\29eb9250-c425-47d5-82da-2cda012ad3cc\.user_uploaded\media_1794862257724_66c55fac.jpg'
$src = [System.Drawing.Bitmap]::FromFile($imgPath)

$outDir = "C:\Users\emili\.gemini\antigravity\scratch\veilborn-steam\js"

# Frame definitions
$frameDefs = @(
    @{ Key = "player_idle_0"; X0 = 15; Y0 = 27; X1 = 80; Y1 = 138 },
    @{ Key = "player_idle_1"; X0 = 89; Y0 = 27; X1 = 149; Y1 = 138 },
    @{ Key = "player_idle_2"; X0 = 157; Y0 = 27; X1 = 220; Y1 = 138 },
    @{ Key = "player_idle_3"; X0 = 229; Y0 = 27; X1 = 295; Y1 = 138 },
    @{ Key = "player_run_0";  X0 = 664; Y0 = 27; X1 = 745; Y1 = 138 },
    @{ Key = "player_run_1";  X0 = 754; Y0 = 27; X1 = 840; Y1 = 138 },
    @{ Key = "player_run_2";  X0 = 843; Y0 = 27; X1 = 924; Y1 = 138 },
    @{ Key = "player_run_3";  X0 = 926; Y0 = 27; X1 = 1004; Y1 = 138 },
    @{ Key = "player_walk_0"; X0 = 343; Y0 = 27; X1 = 418; Y1 = 138 },
    @{ Key = "player_walk_1"; X0 = 422; Y0 = 27; X1 = 491; Y1 = 138 },
    @{ Key = "player_walk_2"; X0 = 497; Y0 = 27; X1 = 557; Y1 = 138 },
    @{ Key = "player_walk_3"; X0 = 564; Y0 = 27; X1 = 629; Y1 = 138 },
    @{ Key = "player_jump_up";   X0 = 104; Y0 = 173; X1 = 182; Y1 = 284 },
    @{ Key = "player_jump_down"; X0 = 460; Y0 = 173; X1 = 528; Y1 = 284 },
    @{ Key = "player_dash";      X0 = 18;  Y0 = 322; X1 = 107; Y1 = 444 },
    @{ Key = "player_hurt";      X0 = 294; Y0 = 322; X1 = 377; Y1 = 444 }
)

$CANVAS_W = 110
$CANVAS_H = 140
$FEET_Y = 132
$CENTER_X = 55

$base64Dict = @{}

foreach ($f in $frameDefs) {
    # 1. Find tight non-black bounding box
    $minX = $f.X1; $maxX = $f.X0; $minY = $f.Y1; $maxY = $f.Y0
    for ($x = $f.X0; $x -le $f.X1; $x++) {
        for ($y = $f.Y0; $y -le $f.Y1; $y++) {
            $c = $src.GetPixel($x, $y)
            if (($c.R + $c.G + $c.B) -gt 45) {
                if ($x -lt $minX) { $minX = $x }
                if ($x -gt $maxX) { $maxX = $x }
                if ($y -lt $minY) { $minY = $y }
                if ($y -gt $maxY) { $maxY = $y }
            }
        }
    }
    
    $midX = [math]::Floor(($minX + $maxX) / 2)
    
    # Create target canvas
    $canvas = New-Object System.Drawing.Bitmap $CANVAS_W, $CANVAS_H, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    
    # Copy pixels onto canvas with proper alignment
    for ($x = $minX; $x -le $maxX; $x++) {
        $tx = $CENTER_X + ($x - $midX)
        if ($tx -lt 0 -or $tx -ge $CANVAS_W) { continue }
        
        for ($y = $minY; $y -le $maxY; $y++) {
            $ty = $FEET_Y - ($maxY - $y)
            if ($ty -lt 0 -or $ty -ge $CANVAS_H) { continue }
            
            $c = $src.GetPixel($x, $y)
            $canvas.SetPixel($tx, $ty, $c)
        }
    }
    
    # 2. Flood-fill from outer edges to remove background without touching dark clothes
    $visited = New-Object 'bool[,]' $CANVAS_W, $CANVAS_H
    $queue = New-Object System.Collections.Generic.Queue[System.Drawing.Point]
    
    # Enqueue borders
    $edgeX = $CANVAS_W - 1
    $edgeY = $CANVAS_H - 1
    for ($x = 0; $x -lt $CANVAS_W; $x++) {
        $queue.Enqueue((New-Object System.Drawing.Point $x, 0))
        $queue.Enqueue((New-Object System.Drawing.Point $x, $edgeY))
        $visited[$x, 0] = $true
        $visited[$x, $edgeY] = $true
    }
    for ($y = 0; $y -lt $CANVAS_H; $y++) {
        $queue.Enqueue((New-Object System.Drawing.Point 0, $y))
        $queue.Enqueue((New-Object System.Drawing.Point $edgeX, $y))
        $visited[0, $y] = $true
        $visited[$edgeX, $y] = $true
    }
    
    $dx = @(1, -1, 0, 0)
    $dy = @(0, 0, 1, -1)
    
    while ($queue.Count -gt 0) {
        $pt = $queue.Dequeue()
        $px = $pt.X; $py = $pt.Y
        $col = $canvas.GetPixel($px, $py)
        $bright = $col.R + $col.G + $col.B
        
        # If very dark, mark transparent and propagate
        if ($bright -le 45) {
            $canvas.SetPixel($px, $py, [System.Drawing.Color]::FromArgb(0, 0, 0, 0))
            for ($i = 0; $i -lt 4; $i++) {
                $nx = $px + $dx[$i]; $ny = $py + $dy[$i]
                if ($nx -ge 0 -and $nx -lt $CANVAS_W -and $ny -ge 0 -and $ny -lt $CANVAS_H) {
                    if (-not $visited[$nx, $ny]) {
                        $visited[$nx, $ny] = $true
                        $queue.Enqueue((New-Object System.Drawing.Point $nx, $ny))
                    }
                }
            }
        } elseif ($bright -le 70) {
            # Soft anti-alias boundary
            $alpha = [int](($bright - 45.0) / 25.0 * 255.0)
            if ($alpha -lt 0) { $alpha = 0 }
            if ($alpha -gt 255) { $alpha = 255 }
            $canvas.SetPixel($px, $py, [System.Drawing.Color]::FromArgb($alpha, $col.R, $col.G, $col.B))
        }
    }
    
    # Save to memory stream as PNG and encode base64
    $ms = New-Object System.IO.MemoryStream
    $canvas.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
    $b64 = [Convert]::ToBase64String($ms.ToArray())
    $base64Dict[$f.Key] = "data:image/png;base64," + $b64
    
    $ms.Dispose()
    $canvas.Dispose()
    Write-Output "Processed $($f.Key): bounds X=$minX..$maxX, Y=$minY..$maxY"
}

$src.Dispose()

# Write assets_data.js
$sb = New-Object System.Text.StringBuilder
[void]$sb.AppendLine("// Auto-generated clean normalized heroine sprites from player sprite sheet")
[void]$sb.AppendLine("window.EMBEDDED_ASSETS = window.EMBEDDED_ASSETS || {};")

foreach ($key in $base64Dict.Keys) {
    [void]$sb.AppendLine("window.EMBEDDED_ASSETS['$key'] = '$($base64Dict[$key])';")
}

[System.IO.File]::WriteAllText("$outDir\assets_data.js", $sb.ToString())
Write-Output "Successfully updated assets_data.js with $($base64Dict.Count) frames!"
