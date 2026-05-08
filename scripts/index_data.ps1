param(
    [string]$SolrBaseUrl = "http://localhost:8983/solr",
    [string]$Collection = "research_portal",
    [string]$DatasetPath = "$PSScriptRoot\..\data\research_articles.json"
)

$ErrorActionPreference = "Stop"

$dataset = Get-Content $DatasetPath -Raw
$uri = "http://localhost:8983/api/collections/$Collection/update?commit=true"

Invoke-RestMethod -Method Post -Uri $uri -ContentType "application/json" -Body $dataset | Out-Null

$verify = Invoke-RestMethod -Method Get -Uri "http://localhost:8983/api/collections/$Collection/select?q=*:*&rows=0&wt=json"

$outputDir = Join-Path $PSScriptRoot "..\\outputs"
if (-not (Test-Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir | Out-Null
}

[ordered]@{
    indexedDocuments = $verify.response.numFound
    datasetPath = (Resolve-Path $DatasetPath).Path
    indexedAt = (Get-Date).ToString("s")
} | ConvertTo-Json -Depth 4 | Set-Content (Join-Path $outputDir "indexing_summary.json")

Write-Host "Indexed $($verify.response.numFound) documents into '$Collection'."
