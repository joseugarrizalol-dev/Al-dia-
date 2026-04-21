from pydantic import BaseModel
from typing import Optional


class ArticleRow(BaseModel):
    id: int
    title: str
    url: str
    outlet: str
    published_at: Optional[str]
    scraped_at: str
    summary: Optional[str]
    analyzed: int
    analyzed_at: Optional[str]
    error: Optional[str]

    score_total: Optional[int]
    score_factual: Optional[int]
    score_linguistic: Optional[int]
    score_context: Optional[int]
    score_framing: Optional[int]
    score_transparency: Optional[int]

    hecho: Optional[str]
    intensidad: Optional[str]
    precision_ling: Optional[str]
    carga_emocional: Optional[str]
    verbos: Optional[str]
    encuadre: Optional[str]
    encuadre_just: Optional[str]
    score_just: Optional[str]


class ScrapeResult(BaseModel):
    inserted: int
    skipped: int
    outlets_fetched: list[str]


class AnalysisResult(BaseModel):
    analyzed: int
    errors: int
    skipped: int
