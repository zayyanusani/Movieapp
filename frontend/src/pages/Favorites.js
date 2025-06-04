import { useState, useEffect } from "react";
import { useAuth } from "../App";
import axios from "axios";
import MovieCard from "../components/MovieCard";
import { HeartIcon } from "@heroicons/react/24/outline";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Favorites = () => {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFavorites();
  }, []);

  const fetchFavorites = async () => {
    try {
      const response = await axios.get(`${API}/favorites`);
      
      // Convert favorites to movie format for MovieCard component
      const moviePromises = response.data.map(async (favorite) => {
        try {
          // Fetch full movie details
          const movieResponse = await axios.get(`${API}/movies/${favorite.movie_id}`);
          return movieResponse.data;
        } catch (error) {
          // Fallback to basic info if TMDB fails
          return {
            id: favorite.movie_id,
            title: favorite.movie_title,
            poster_path: favorite.movie_poster,
            vote_average: 0,
            overview: 'Details not available'
          };
        }
      });

      const movies = await Promise.all(moviePromises);
      setFavorites(movies);
    } catch (error) {
      console.error('Error fetching favorites:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFavoriteChange = () => {
    // Refresh favorites when a movie is removed
    fetchFavorites();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <HeartIcon className="h-8 w-8 text-red-500" />
            <h1 className="text-4xl font-bold text-white">My Favorites</h1>
          </div>
          <p className="text-gray-400">
            {favorites.length} movie{favorites.length !== 1 ? 's' : ''} in your favorites
          </p>
        </div>

        {favorites.length === 0 ? (
          <div className="text-center py-12">
            <HeartIcon className="h-24 w-24 text-gray-600 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-white mb-2">No favorites yet</h2>
            <p className="text-gray-400 mb-6">
              Start adding movies to your favorites by clicking the heart icon on any movie
            </p>
            <a
              href="/movies"
              className="inline-flex items-center px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors duration-200"
            >
              Discover Movies
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {favorites.map((movie) => (
              <MovieCard 
                key={movie.id} 
                movie={movie} 
                onFavoriteChange={handleFavoriteChange}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Favorites;