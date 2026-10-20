"""
CineMetrics — Test Suite for Backend API Endpoints & Logic
===========================================================
Validates:
- All 11 REST API endpoints
- Pagination, sorting, and filtering logic
- Bayesian weighted ratings
- MapReduce output data integrity
- Deterministic calculations against MovieLens data
"""

import sys
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(backend_dir))

import data_loader
from main import app

client = TestClient(app)


@pytest.fixture(scope="session", autouse=True)
def setup_data():
    """Ensure data is loaded before running tests."""
    data_loader.init_data()


def test_health_check():
    """Test root health check endpoint."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ["healthy", "running"]
    assert "CineMetrics" in data["service"]


def test_overview_endpoint():
    """Test /api/overview returns non-empty genuine statistics."""
    response = client.get("/api/overview")
    assert response.status_code == 200
    data = response.json()

    assert data["totalMovies"] == 9742
    assert data["totalRatings"] == 100836
    assert data["uniqueUsers"] == 610
    assert 3.4 <= data["globalAverageRating"] <= 3.6
    assert data["genreCount"] >= 18
    assert data["highestRatedMovie"] is not None
    assert "title" in data["highestRatedMovie"]


def test_movies_pagination():
    """Test /api/movies pagination and sorting."""
    # Test default page 1
    response = client.get("/api/movies?page=1&pageSize=10")
    assert response.status_code == 200
    data = response.json()
    items = data.get("movies", data.get("items", []))
    assert len(items) == 10
    assert data["total"] == 9742
    assert data["page"] == 1

    # Test sorting by ratingCount desc
    response_sort = client.get("/api/movies?page=1&pageSize=5&sortBy=ratingCount&sortOrder=desc")
    assert response_sort.status_code == 200
    items_sorted = response_sort.json().get("movies", response_sort.json().get("items", []))
    assert items_sorted[0]["ratingCount"] >= items_sorted[1]["ratingCount"]


def test_movies_search_and_genre_filter():
    """Test searching by title and filtering by genre."""
    # Search for Matrix
    response = client.get("/api/movies?search=Matrix")
    assert response.status_code == 200
    items = response.json().get("movies", response.json().get("items", []))
    assert len(items) > 0
    assert any("Matrix" in m["title"] for m in items)

    # Filter by Genre Action
    response_genre = client.get("/api/movies?genre=Action&pageSize=20")
    assert response_genre.status_code == 200
    items_genre = response_genre.json().get("movies", response_genre.json().get("items", []))
    assert all("Action" in m.get("genres", "") or "Action" in m.get("genreList", []) for m in items_genre)


def test_movie_detail():
    """Test /api/movies/{id} for movie 1 (Toy Story)."""
    response = client.get("/api/movies/1")
    assert response.status_code == 200
    movie = response.json()
    assert movie["movieId"] == 1
    assert "Toy Story" in movie["title"]
    assert movie["avgRating"] > 3.5
    assert movie["ratingCount"] > 100


def test_genres_endpoint():
    """Test /api/genres returns genres with movie counts and rating counts."""
    response = client.get("/api/genres")
    assert response.status_code == 200
    genres = response.json()
    assert len(genres) >= 18
    # Drama or Comedy should be among the top genres
    top_genres = [g["genre"] for g in genres[:3]]
    assert any(g in ["Drama", "Comedy", "Action"] for g in top_genres)


def test_rating_distribution():
    """Test /api/ratings/distribution returns all 10 half-star intervals."""
    response = client.get("/api/ratings/distribution")
    assert response.status_code == 200
    dist = response.json()
    assert len(dist) == 10
    total_ratings = sum(item["count"] for item in dist)
    assert total_ratings == 100836


def test_rating_trends():
    """Test /api/ratings/trends returns monthly time series."""
    response = client.get("/api/ratings/trends")
    assert response.status_code == 200
    trends = response.json()
    assert len(trends) > 100
    assert "yearMonth" in trends[0]
    assert "avgRating" in trends[0]


def test_year_ratings():
    """Test /api/ratings/years returns release year aggregations."""
    response = client.get("/api/ratings/years")
    assert response.status_code == 200
    years = response.json()
    assert len(years) > 50
    # Check 1995 exists (Toy Story year)
    years_map = {y["year"]: y for y in years}
    assert "1995" in years_map
    assert years_map["1995"]["ratingCount"] > 1000


def test_hidden_gems():
    """Test /api/analytics/hidden-gems filters high ratings with moderate counts."""
    response = client.get("/api/analytics/hidden-gems?limit=10&minRating=4.0")
    assert response.status_code == 200
    gems = response.json()
    assert len(gems) <= 10
    for gem in gems:
        assert gem["avgRating"] >= 4.0
        assert gem["ratingCount"] <= 50
        score = gem.get("weightedScore") or gem.get("hiddenGemScore")
        assert score > 3.0


def test_hadoop_status_and_jobs():
    """Test /api/hadoop/status and /api/hadoop/jobs."""
    status_resp = client.get("/api/hadoop/status")
    assert status_resp.status_code == 200
    assert "connected" in status_resp.json()

    jobs_resp = client.get("/api/hadoop/jobs")
    assert jobs_resp.status_code == 200
    jobs_data = jobs_resp.json()
    # jobs_data is a list of jobs
    assert len(jobs_data) >= 7
    job_names = [j["jobName"] for j in jobs_data]
    assert any("Average" in j for j in job_names)
    assert any("Genre" in j for j in job_names)


def test_dataset_info():
    """Test /api/dataset/info returns correct metadata."""
    resp = client.get("/api/dataset/info")
    assert resp.status_code == 200
    info = resp.json()
    assert info["name"] == "MovieLens Latest Small"
    assert "grouplens.org" in info["source"]
