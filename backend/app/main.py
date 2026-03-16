"""
PantheonMed AI — FastAPI Backend
"""
import os
from fastapi import FastAPI

app = FastAPI(title="PantheonMed AI API")


@app.get("/health")
async def health():
    """Health check for Railway and load balancers."""
    return {"status": "healthy"}


@app.get("/")
async def root():
    """Root endpoint."""
    return {"message": "PantheonMed AI API", "docs": "/docs"}
