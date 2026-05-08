param(
    [string]$SolrBaseUrl = "http://localhost:8983/solr",
    [string]$Collection = "research_portal"
)

$ErrorActionPreference = "Stop"

function Invoke-SolrJson {
    param(
        [string]$Method,
        [string]$Uri,
        [object]$Body
    )

    if ($null -eq $Body) {
        return Invoke-RestMethod -Method $Method -Uri $Uri
    }

    $json = $Body | ConvertTo-Json -Depth 10
    return Invoke-RestMethod -Method $Method -Uri $Uri -ContentType "application/json" -Body $json
}

$listUri = "$SolrBaseUrl/admin/collections?action=LIST&wt=json"
$collections = Invoke-RestMethod -Method Get -Uri $listUri

if ($collections.collections -contains $Collection) {
    Write-Host "Collection '$Collection' already exists."
} else {
    $createUri = "$SolrBaseUrl/admin/collections?action=CREATE&name=$Collection&numShards=2&replicationFactor=1&collection.configName=_default&wt=json"
    Invoke-RestMethod -Method Get -Uri $createUri | Out-Null
    Write-Host "Created collection '$Collection' with two shards."
}

Start-Sleep -Seconds 2

$schemaUri = "$SolrBaseUrl/$Collection/schema"

$fieldsPayload = @{
    "add-field" = @(
        @{ name = "title"; type = "text_general"; indexed = $true; stored = $true },
        @{ name = "abstract"; type = "text_general"; indexed = $true; stored = $true },
        @{ name = "authors"; type = "text_general"; indexed = $true; stored = $true; multiValued = $true },
        @{ name = "category"; type = "string"; indexed = $true; stored = $true },
        @{ name = "year"; type = "pint"; indexed = $true; stored = $true },
        @{ name = "venue"; type = "string"; indexed = $true; stored = $true },
        @{ name = "document_type"; type = "string"; indexed = $true; stored = $true },
        @{ name = "keywords"; type = "text_general"; indexed = $true; stored = $true; multiValued = $true },
        @{ name = "citations"; type = "pint"; indexed = $true; stored = $true },
        @{ name = "access_type"; type = "string"; indexed = $true; stored = $true },
        @{ name = "doi"; type = "string"; indexed = $true; stored = $true },
        @{ name = "url"; type = "string"; indexed = $true; stored = $true },
        @{ name = "all_text"; type = "text_general"; indexed = $true; stored = $false }
    )
    "add-copy-field" = @(
        @{ source = "title"; dest = "all_text" },
        @{ source = "abstract"; dest = "all_text" },
        @{ source = "authors"; dest = "all_text" },
        @{ source = "keywords"; dest = "all_text" },
        @{ source = "venue"; dest = "all_text" }
    )
}

try {
    Invoke-SolrJson -Method Post -Uri $schemaUri -Body $fieldsPayload | Out-Null
    Write-Host "Schema fields configured successfully."
} catch {
    Write-Host "Schema fields may already exist. Continuing."
}

$configUri = "$SolrBaseUrl/$Collection/config"
$configPayload = @{
    "set-property" = @{
        "update.autoCreateFields" = $false
    }
}

try {
    Invoke-SolrJson -Method Post -Uri $configUri -Body $configPayload | Out-Null
    Write-Host "Disabled automatic field creation."
} catch {
    Write-Host "Config update skipped."
}

$summary = [ordered]@{
    collection = $Collection
    shards = 2
    replicationFactor = 1
    configuredAt = (Get-Date).ToString("s")
}

$outputDir = Join-Path $PSScriptRoot "..\\outputs"
if (-not (Test-Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir | Out-Null
}

$summary | ConvertTo-Json -Depth 5 | Set-Content (Join-Path $outputDir "collection_setup_summary.json")
Write-Host "Saved collection summary to outputs\\collection_setup_summary.json"
