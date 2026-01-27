$files = @(
    "frontend\src\pages\Settings.tsx",
    "frontend\src\pages\Recurring.tsx",
    "frontend\src\pages\Home.tsx",
    "frontend\src\pages\History.tsx",
    "frontend\src\pages\Analytics.tsx",
    "frontend\src\components\StartSessionDialog.tsx",
    "frontend\src\components\ActiveSessionCard.tsx"
)

foreach ($file in $files) {
    $fullPath = "c:\Users\nogyu\.gemini\KuroTask\$file"
    if (Test-Path $fullPath) {
        Write-Host "Processing: $file"
        
        # Read content
        $content = Get-Content $fullPath -Raw
        
        # Remove API_BASE constant line
        $content = $content -replace "const API_BASE = ``http://\$\{window\.location\.hostname\}:3000``;\r?\n", ""
        
        # Add useAuth import if not present
        if ($content -notmatch "import \{ useAuth \}") {
            $content = $content -replace "(import.*from 'react';)", "`$1`r`nimport { useAuth } from '../contexts/AuthContext';"
        }
        
        # Replace ${API_BASE} with ${apiUrl}
        $content = $content -replace '\$\{API_BASE\}', '${apiUrl}'
        
        # Add const { apiUrl } = useAuth(); after function declaration
        if ($content -match "export default function (\w+)\(\) \{") {
            $funcName = $Matches[1]
            if ($content -notmatch "const \{ apiUrl \} = useAuth\(\);") {
                $content = $content -replace "(export default function $funcName\(\) \{)", "`$1`r`n    const { apiUrl } = useAuth();"
            }
        }
        
        # Write back
        Set-Content -Path $fullPath -Value $content -NoNewline
        Write-Host "  ✓ Done"
    } else {
        Write-Host "  ✗ File not found: $file"
    }
}

Write-Host "`nAll files processed!"
