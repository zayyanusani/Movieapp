from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timedelta
import httpx
import jwt
import bcrypt
from jwt.exceptions import InvalidTokenError

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Environment variables
mongo_url = os.environ['MONGO_URL']
db_name = os.environ['DB_NAME']
tmdb_api_key = os.environ['TMDB_API_KEY']
tmdb_base_url = os.environ['TMDB_BASE_URL']
jwt_secret = os.environ['JWT_SECRET_KEY']
jwt_algorithm = os.environ['JWT_ALGORITHM']
jwt_expiration_hours = int(os.environ['JWT_EXPIRATION_HOURS'])

# MongoDB connection
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

# FastAPI app setup
app = FastAPI(title="Movie Recommendation API")
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# TMDB HTTP client
tmdb_headers = {
    "Authorization": f"Bearer {tmdb_api_key}",
    "Content-Type": "application/json"
}

# Pydantic Models
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    name: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    profile_image: Optional[str] = None

class UserInDB(User):
    hashed_password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: User

class Movie(BaseModel):
    id: int
    title: str
    overview: str
    poster_path: Optional[str]
    backdrop_path: Optional[str]
    release_date: Optional[str]
    vote_average: float
    vote_count: int
    genre_ids: List[int]
    genres: Optional[List[Dict[str, Any]]] = None
    runtime: Optional[int] = None
    production_companies: Optional[List[Dict[str, Any]]] = None

class UserMovie(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    movie_id: int
    movie_title: str
    movie_poster: Optional[str]
    added_at: datetime = Field(default_factory=datetime.utcnow)

class UserReview(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    movie_id: int
    rating: float = Field(ge=0, le=10)
    review_text: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Watchlist(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    name: str
    description: Optional[str] = None
    movies: List[UserMovie] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)

class AddToWatchlistRequest(BaseModel):
    movie_id: int
    movie_title: str
    movie_poster: Optional[str] = None

class CreateReviewRequest(BaseModel):
    movie_id: int
    rating: float = Field(ge=0, le=10)
    review_text: Optional[str] = None

# Utility functions
def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(hours=jwt_expiration_hours)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, jwt_secret, algorithm=jwt_algorithm)
    return encoded_jwt

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def get_password_hash(password: str) -> str:
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, jwt_secret, algorithms=[jwt_algorithm])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    except InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    
    user = await db.users.find_one({"id": user_id})
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    
    return User(**user)

# TMDB API functions
async def search_movies_tmdb(query: str, page: int = 1):
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{tmdb_base_url}/search/movie",
            headers=tmdb_headers,
            params={"query": query, "page": page}
        )
        if response.status_code == 200:
            return response.json()
        return None

async def get_movie_details_tmdb(movie_id: int):
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{tmdb_base_url}/movie/{movie_id}",
            headers=tmdb_headers
        )
        if response.status_code == 200:
            return response.json()
        return None

async def get_popular_movies_tmdb(page: int = 1):
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{tmdb_base_url}/movie/popular",
            headers=tmdb_headers,
            params={"page": page}
        )
        if response.status_code == 200:
            return response.json()
        return None

async def get_top_rated_movies_tmdb(page: int = 1):
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{tmdb_base_url}/movie/top_rated",
            headers=tmdb_headers,
            params={"page": page}
        )
        if response.status_code == 200:
            return response.json()
        return None

async def get_movie_genres_tmdb():
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{tmdb_base_url}/genre/movie/list",
            headers=tmdb_headers
        )
        if response.status_code == 200:
            return response.json()
        return None

async def discover_movies_tmdb(genre_id: Optional[int] = None, year: Optional[int] = None, 
                              sort_by: str = "popularity.desc", page: int = 1):
    params = {"page": page, "sort_by": sort_by}
    if genre_id:
        params["with_genres"] = genre_id
    if year:
        params["year"] = year
        
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{tmdb_base_url}/discover/movie",
            headers=tmdb_headers,
            params=params
        )
        if response.status_code == 200:
            return response.json()
        return None

# Authentication endpoints
@api_router.post("/auth/register", response_model=Token)
async def register(user_data: UserCreate):
    # Check if user already exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create new user
    hashed_password = get_password_hash(user_data.password)
    user_dict = {
        "id": str(uuid.uuid4()),
        "email": user_data.email,
        "name": user_data.name,
        "hashed_password": hashed_password,
        "created_at": datetime.utcnow(),
        "profile_image": None
    }
    
    await db.users.insert_one(user_dict)
    
    # Create access token
    access_token = create_access_token(data={"sub": user_dict["id"]})
    user = User(**{k: v for k, v in user_dict.items() if k != "hashed_password"})
    
    return Token(access_token=access_token, token_type="bearer", user=user)

@api_router.post("/auth/login", response_model=Token)
async def login(user_data: UserLogin):
    user = await db.users.find_one({"email": user_data.email})
    if not user or not verify_password(user_data.password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    
    access_token = create_access_token(data={"sub": user["id"]})
    user_obj = User(**{k: v for k, v in user.items() if k != "hashed_password"})
    
    return Token(access_token=access_token, token_type="bearer", user=user_obj)

@api_router.get("/auth/me", response_model=User)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    return current_user

# Movie endpoints
@api_router.get("/movies/search")
async def search_movies(q: str, page: int = 1):
    result = await search_movies_tmdb(q, page)
    if result is None:
        raise HTTPException(status_code=500, detail="Failed to fetch movies")
    return result

@api_router.get("/movies/popular")
async def get_popular_movies(page: int = 1):
    result = await get_popular_movies_tmdb(page)
    if result is None:
        raise HTTPException(status_code=500, detail="Failed to fetch popular movies")
    return result

@api_router.get("/movies/top-rated")
async def get_top_rated_movies(page: int = 1):
    result = await get_top_rated_movies_tmdb(page)
    if result is None:
        raise HTTPException(status_code=500, detail="Failed to fetch top rated movies")
    return result

@api_router.get("/movies/discover")
async def discover_movies(genre_id: Optional[int] = None, year: Optional[int] = None, 
                         sort_by: str = "popularity.desc", page: int = 1):
    result = await discover_movies_tmdb(genre_id, year, sort_by, page)
    if result is None:
        raise HTTPException(status_code=500, detail="Failed to discover movies")
    return result

@api_router.get("/movies/{movie_id}")
async def get_movie_details(movie_id: int):
    result = await get_movie_details_tmdb(movie_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Movie not found")
    return result

@api_router.get("/genres")
async def get_genres():
    result = await get_movie_genres_tmdb()
    if result is None:
        raise HTTPException(status_code=500, detail="Failed to fetch genres")
    return result

# User favorites endpoints
@api_router.post("/favorites")
async def add_to_favorites(movie_data: AddToWatchlistRequest, current_user: User = Depends(get_current_user)):
    # Check if already in favorites
    existing = await db.favorites.find_one({"user_id": current_user.id, "movie_id": movie_data.movie_id})
    if existing:
        raise HTTPException(status_code=400, detail="Movie already in favorites")
    
    favorite = UserMovie(
        user_id=current_user.id,
        movie_id=movie_data.movie_id,
        movie_title=movie_data.movie_title,
        movie_poster=movie_data.movie_poster
    )
    
    await db.favorites.insert_one(favorite.dict())
    return {"message": "Movie added to favorites"}

@api_router.get("/favorites", response_model=List[UserMovie])
async def get_favorites(current_user: User = Depends(get_current_user)):
    favorites = await db.favorites.find({"user_id": current_user.id}).to_list(100)
    return [UserMovie(**fav) for fav in favorites]

@api_router.delete("/favorites/{movie_id}")
async def remove_from_favorites(movie_id: int, current_user: User = Depends(get_current_user)):
    result = await db.favorites.delete_one({"user_id": current_user.id, "movie_id": movie_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Movie not found in favorites")
    return {"message": "Movie removed from favorites"}

# Watchlist endpoints
@api_router.post("/watchlists", response_model=Watchlist)
async def create_watchlist(name: str, description: Optional[str] = None, current_user: User = Depends(get_current_user)):
    watchlist = Watchlist(
        user_id=current_user.id,
        name=name,
        description=description
    )
    await db.watchlists.insert_one(watchlist.dict())
    return watchlist

@api_router.get("/watchlists", response_model=List[Watchlist])
async def get_watchlists(current_user: User = Depends(get_current_user)):
    watchlists = await db.watchlists.find({"user_id": current_user.id}).to_list(100)
    return [Watchlist(**wl) for wl in watchlists]

@api_router.post("/watchlists/{watchlist_id}/movies")
async def add_movie_to_watchlist(watchlist_id: str, movie_data: AddToWatchlistRequest, current_user: User = Depends(get_current_user)):
    watchlist = await db.watchlists.find_one({"id": watchlist_id, "user_id": current_user.id})
    if not watchlist:
        raise HTTPException(status_code=404, detail="Watchlist not found")
    
    movie = UserMovie(
        user_id=current_user.id,
        movie_id=movie_data.movie_id,
        movie_title=movie_data.movie_title,
        movie_poster=movie_data.movie_poster
    )
    
    # Check if movie already in watchlist
    watchlist_obj = Watchlist(**watchlist)
    if any(m.movie_id == movie_data.movie_id for m in watchlist_obj.movies):
        raise HTTPException(status_code=400, detail="Movie already in watchlist")
    
    await db.watchlists.update_one(
        {"id": watchlist_id, "user_id": current_user.id},
        {"$push": {"movies": movie.dict()}}
    )
    return {"message": "Movie added to watchlist"}

@api_router.delete("/watchlists/{watchlist_id}/movies/{movie_id}")
async def remove_movie_from_watchlist(watchlist_id: str, movie_id: int, current_user: User = Depends(get_current_user)):
    result = await db.watchlists.update_one(
        {"id": watchlist_id, "user_id": current_user.id},
        {"$pull": {"movies": {"movie_id": movie_id}}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Movie not found in watchlist")
    return {"message": "Movie removed from watchlist"}

# Reviews endpoints
@api_router.post("/reviews", response_model=UserReview)
async def create_review(review_data: CreateReviewRequest, current_user: User = Depends(get_current_user)):
    # Check if user already reviewed this movie
    existing = await db.reviews.find_one({"user_id": current_user.id, "movie_id": review_data.movie_id})
    if existing:
        # Update existing review
        await db.reviews.update_one(
            {"user_id": current_user.id, "movie_id": review_data.movie_id},
            {"$set": {"rating": review_data.rating, "review_text": review_data.review_text}}
        )
        updated_review = await db.reviews.find_one({"user_id": current_user.id, "movie_id": review_data.movie_id})
        return UserReview(**updated_review)
    
    review = UserReview(
        user_id=current_user.id,
        movie_id=review_data.movie_id,
        rating=review_data.rating,
        review_text=review_data.review_text
    )
    await db.reviews.insert_one(review.dict())
    return review

@api_router.get("/reviews/user", response_model=List[UserReview])
async def get_user_reviews(current_user: User = Depends(get_current_user)):
    reviews = await db.reviews.find({"user_id": current_user.id}).to_list(100)
    return [UserReview(**review) for review in reviews]

@api_router.get("/reviews/movie/{movie_id}", response_model=List[UserReview])
async def get_movie_reviews(movie_id: int):
    reviews = await db.reviews.find({"movie_id": movie_id}).to_list(100)
    return [UserReview(**review) for review in reviews]

# Recommendations endpoint
@api_router.get("/recommendations")
async def get_recommendations(current_user: User = Depends(get_current_user)):
    # Simple recommendation based on user's favorites and highly rated movies
    user_favorites = await db.favorites.find({"user_id": current_user.id}).to_list(50)
    
    if not user_favorites:
        # If no favorites, return popular movies
        return await get_popular_movies_tmdb()
    
    # Get genre preferences from favorites
    favorite_movie_ids = [fav["movie_id"] for fav in user_favorites]
    genre_counts = {}
    
    for movie_id in favorite_movie_ids[:10]:  # Limit to recent favorites
        movie_details = await get_movie_details_tmdb(movie_id)
        if movie_details and "genres" in movie_details:
            for genre in movie_details["genres"]:
                genre_id = genre["id"]
                genre_counts[genre_id] = genre_counts.get(genre_id, 0) + 1
    
    # Get most common genre
    if genre_counts:
        top_genre = max(genre_counts, key=genre_counts.get)
        recommendations = await discover_movies_tmdb(genre_id=top_genre, sort_by="vote_average.desc")
        if recommendations:
            return recommendations
    
    # Fallback to top rated movies
    return await get_top_rated_movies_tmdb()

# Health check
@api_router.get("/")
async def root():
    return {"message": "Movie Recommendation API is running!"}

# Include router
app.include_router(api_router)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
