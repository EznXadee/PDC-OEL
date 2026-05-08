# Apache Solr Open Ended Lab

This submission implements a professional end to end Solr search project for the CS-347 open ended lab. The project uses a research article dataset, configures a sharded Solr collection, indexes structured JSON documents, runs advanced search queries, and exposes the search experience through a responsive web interface.

## Project Structure

- `data/research_articles.json` curated dataset used for indexing
- `scripts/setup_solr.ps1` creates the Solr collection and configures schema fields
- `scripts/index_data.ps1` imports the dataset into Solr
- `scripts/run_queries.ps1` executes representative search queries and stores outputs
- `scripts/analyze_results.py` measures response times and produces benchmark artifacts
- `web/server.js` lightweight Node server with Solr proxy endpoints
- `web/public/` frontend assets for the live search interface
- `outputs/` generated JSON results, screenshots, and report assets
- `reports/` final submission report
- `submission/` optional packaged LMS artifact and other final handoff files

## Dataset Choice

The dataset models a digital research portal. Each document represents a research article with searchable metadata:

- `title`
- `abstract`
- `authors`
- `category`
- `year`
- `venue`
- `document_type`
- `keywords`
- `citations`
- `access_type`
- `doi`
- `url`

This dataset was chosen because it supports meaningful full text search, filtering, sorting, faceting, and highlighting.

## Run Order

1. Start Solr on port `8983`
2. Run `scripts/setup_solr.ps1`
3. Run `scripts/index_data.ps1`
4. Run `scripts/run_queries.ps1`
5. Run `scripts/analyze_results.py`
6. Regenerate the report with `python scripts/generate_report.py`
7. Start the web interface with `node web/server.js`

## GitHub Publishing

Suggested GitHub repository owner:

- `EznXadee`

Suggested repository name:

- `PDC-OEL-Solr-Lab`

Suggested repository URL after creation:

- `https://github.com/EznXadee/PDC-OEL-Solr-Lab`

The large local Solr installation folders and generated submission zip are intentionally ignored by Git so only the actual lab source and report assets are published.

## Notes

The implementation is designed for a single local SolrCloud node with two logical shards so the report can discuss clustered indexing and distributed querying without requiring multiple machines.
