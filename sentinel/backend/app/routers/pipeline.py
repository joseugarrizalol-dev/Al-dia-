from fastapi import APIRouter, BackgroundTasks, Query
from app.scrapers.rss import run_scraper
from app.analysis.sentinel import run_analysis

router = APIRouter()


@router.post("/scrape")
def scrape(background_tasks: BackgroundTasks):
    """Trigger RSS scrape in the background."""
    background_tasks.add_task(run_scraper)
    return {"status": "scraping started"}


@router.post("/scrape/sync")
def scrape_sync():
    """Trigger RSS scrape synchronously (for testing)."""
    result = run_scraper()
    return result


@router.post("/analyze")
def analyze(
    background_tasks: BackgroundTasks,
    batch: int = Query(20, le=50, description="Max articles per run"),
):
    """Trigger Sentinel Score analysis in the background."""
    background_tasks.add_task(run_analysis, batch)
    return {"status": "analysis started", "batch": batch}


@router.post("/analyze/sync")
def analyze_sync(batch: int = Query(10, le=50)):
    """Trigger analysis synchronously (for testing)."""
    result = run_analysis(batch)
    return result


@router.post("/run")
def run_full_pipeline(background_tasks: BackgroundTasks):
    """Scrape + analyze in sequence (background)."""
    def _pipeline():
        run_scraper()
        run_analysis()
    background_tasks.add_task(_pipeline)
    return {"status": "pipeline started"}
