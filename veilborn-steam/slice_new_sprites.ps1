Add-Type -AssemblyName System.Drawing

$imgPath = 'C:\Users\emili\.gemini\antigravity\brain\29eb9250-c425-47d5-82da-2cda012ad3cc\.user_uploaded\media_1795039894892_3bef950f.png'
$src = [System.Drawing.Bitmap]::FromFile($imgPath)

$outDir = "C:\Users\emili\.gemini\antigravity\scratch\veilborn-steam\js"

$CANVAS_W = 180
$CANVAS_H = 220
$BASE_Y = 210
$CENTER_X = 90

# Define frames with their alignment mode
# Mode "ground": anchored by maxY at $BASE_Y
# Mode "head": anchored by minY at specified headY
$frameDefs = @(
    # --- Row 1: IDLE (4 frames) ---
    @{ Key = "player_idle_0"; X0 = 248; X1 = 304; Y0 = 0; Y1 = 203; Mode = "ground"; GroundY = $BASE_Y },
    @{ Key = "player_idle_1"; X0 = 362; X1 = 422; Y0 = 0; Y1 = 203; Mode = "ground"; GroundY = $BASE_Y },
    @{ Key = "player_idle_2"; X0 = 481; X1 = 544; Y0 = 0; Y1 = 203; Mode = "ground"; GroundY = $BASE_Y },
    @{ Key = "player_idle_3"; X0 = 610; X1 = 674; Y0 = 0; Y1 = 203; Mode = "ground"; GroundY = $BASE_Y },

    # --- Row 2: RUN (7 frames) ---
    @{ Key = "player_run_0"; X0 = 6;   X1 = 145; Y0 = 212; Y1 = 387; Mode = "run"; StrideBase = 387 },
    @{ Key = "player_run_1"; X0 = 158; X1 = 299; Y0 = 212; Y1 = 387; Mode = "run"; StrideBase = 387 },
    @{ Key = "player_run_2"; X0 = 311; X1 = 434; Y0 = 212; Y1 = 387; Mode = "run"; StrideBase = 387 },
    @{ Key = "player_run_3"; X0 = 453; X1 = 566; Y0 = 212; Y1 = 387; Mode = "run"; StrideBase = 387 },
    @{ Key = "player_run_4"; X0 = 567; X1 = 689; Y0 = 212; Y1 = 387; Mode = "run"; StrideBase = 387 },
    @{ Key = "player_run_5"; X0 = 693; X1 = 824; Y0 = 212; Y1 = 387; Mode = "run"; StrideBase = 387 },
    @{ Key = "player_run_6"; X0 = 864; X1 = 1009; Y0 = 212; Y1 = 387; Mode = "run"; StrideBase = 387 },

    # --- Row 3: JUMP (6 frames) ---
    @{ Key = "player_jump_prep";    X0 = 30;  X1 = 143; Y0 = 400; Y1 = 575; Mode = "ground"; GroundY = $BASE_Y },
    @{ Key = "player_jump_launch";  X0 = 194; X1 = 310; Y0 = 400; Y1 = 575; Mode = "ground"; GroundY = ($BASE_Y - 4) },
    @{ Key = "player_jump_up";      X0 = 372; X1 = 478; Y0 = 400; Y1 = 575; Mode = "head";   HeadY = 25 },
    @{ Key = "player_jump_down";    X0 = 522; X1 = 681; Y0 = 400; Y1 = 575; Mode = "head";   HeadY = 25 },
    @{ Key = "player_jump_land";    X0 = 690; X1 = 820; Y0 = 400; Y1 = 575; Mode = "ground"; GroundY = $BASE_Y },
    @{ Key = "player_jump_recover"; X0 = 876; X1 = 988; Y0 = 400; Y1 = 575; Mode = "ground"; GroundY = $BASE_Y }
)

$base64Dict = @{}

foreach ($f in $frameDefs) {
    # Find tight alpha bounding box
    $minX = $f.X1; $maxX = $f.X0; $minY = $f.Y1; $maxY = $f.Y0
    for ($x = $f.X0; $x -le $f.X1; $x++) {
        for ($y = $f.Y0; $y -le $f.Y1; $y++) {
            if ($src.GetPixel($x, $y).A -gt 15) {
                if ($x -lt $minX) { $minX = $x }
                if ($x -gt $maxX) { $maxX = $x }
                if ($y -lt $minY) { $minY = $y }
                if ($y -gt $maxY) { $maxY = $y }
            }
        }
    }

    $midX = [math]::Floor(($minX + $maxX) / 2)

    # Calculate Y placement
    $targetYOffset = 0
    if ($f.Mode -eq "ground") {
        # $maxY lands at $f.GroundY
        $targetYOffset = $f.GroundY - $maxY
    } elseif ($f.Mode -eq "run") {
        # Running stride baseline
        $targetYOffset = $BASE_Y - $f.StrideBase
    } elseif ($f.Mode -eq "head") {
        # $minY lands at $f.HeadY
        $targetYOffset = $f.HeadY - $minY
    }

    # Create target canvas
    $canvas = New-Object System.Drawing.Bitmap $CANVAS_W, $CANVAS_H, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)

    for ($x = $minX; $x -le $maxX; $x++) {
        $tx = $CENTER_X + ($x - $midX)
        if ($tx -lt 0 -or $tx -ge $CANVAS_W) { continue }

        for ($y = $minY; $y -le $maxY; $y++) {
            $ty = $y + $targetYOffset
            if ($ty -lt 0 -or $ty -ge $CANVAS_H) { continue }

            $c = $src.GetPixel($x, $y)
            $canvas.SetPixel($tx, $ty, $c)
        }
    }

    # Save to memory stream as PNG and encode base64
    $ms = New-Object System.IO.MemoryStream
    $canvas.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
    $b64 = [Convert]::ToBase64String($ms.ToArray())
    $base64Dict[$f.Key] = "data:image/png;base64," + $b64

    $ms.Dispose()
    $canvas.Dispose()
    Write-Output "Extracted $($f.Key): X=$minX..$maxX, Y=$minY..$maxY"
}

$src.Dispose()

# Write assets_data.js
$sb = New-Object System.Text.StringBuilder
[void]$sb.AppendLine("// Auto-generated clean normalized heroine sprites from user uploaded sprite sheet")
[void]$sb.AppendLine("window.EMBEDDED_ASSETS = window.EMBEDDED_ASSETS || {};")

foreach ($key in $base64Dict.Keys) {
    [void]$sb.AppendLine("window.EMBEDDED_ASSETS['$key'] = '$($base64Dict[$key])';")
}

[System.IO.File]::WriteAllText("$outDir\assets_data.js", $sb.ToString())
Write-Output "Successfully updated assets_data.js with $($base64Dict.Count) frames!"
