param(
    [string]$SolrBaseUrl = "http://localhost:8983/solr",
    [string]$Collection = "research_portal"
)

$ErrorActionPreference = "Stop"
$outputDir = Join-Path $PSScriptRoot "..\\outputs\\query_results"
if (-not (Test-Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
}

$queries = @(
    @{
        name = "basic_full_text"
        uri = "http://localhost:8983/api/collections/$Collection/select?defType=edismax&q=neural%20search&qf=title^4%20abstract^2%20keywords^3%20authors^2&rows=5&hl=true&hl.fl=title,abstract&wt=json"
    },
    @{
        name = "filtered_open_access"
        uri = "http://localhost:8983/api/collections/$Collection/select?defType=edismax&q=retrieval&qf=title^4%20abstract^2%20keywords^3&fq=access_type:%22Open%20Access%22&sort=year%20desc&rows=5&hl=true&hl.fl=title,abstract&wt=json"
    },
    @{
        name = "facet_navigation"
        uri = "http://localhost:8983/api/collections/$Collection/select?q=*:*&rows=0&json.facet=%7B%22category%22%3A%7B%22type%22%3A%22terms%22%2C%22field%22%3A%22category%22%2C%22limit%22%3A10%7D%2C%22access_type%22%3A%7B%22type%22%3A%22terms%22%2C%22field%22%3A%22access_type%22%2C%22limit%22%3A10%7D%2C%22year%22%3A%7B%22type%22%3A%22terms%22%2C%22field%22%3A%22year%22%2C%22limit%22%3A10%2C%22sort%22%3A%22index%20desc%22%7D%7D&wt=json"
    },
    @{
        name = "sorted_by_citations"
        uri = "http://localhost:8983/api/collections/$Collection/select?defType=edismax&q=search&qf=all_text&sort=citations%20desc&rows=5&wt=json"
    }
)

foreach ($query in $queries) {
    $result = Invoke-RestMethod -Method Get -Uri $query.uri
    $result | ConvertTo-Json -Depth 12 | Set-Content (Join-Path $outputDir "$($query.name).json")
    Write-Host "Saved $($query.name).json"
}
