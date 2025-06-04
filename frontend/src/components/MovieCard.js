import { Link } from "react-router-dom";
import { StarIcon, HeartIcon } from "@heroicons/react/24/solid";
import { HeartIcon as HeartOutlineIcon } from "@heroicons/react/24/outline";
import { useAuth } from "../App";
import { useState, useEffect } from "react";
import axios from "axios";
import toast from "react-hot-toast";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const MovieCard = ({ movie, onFavoriteChange = null }) => {
  const { user } = useAuth();
  const [isFavorited, setIsFavorited] = useState(false);
  const [loading, setLoading] = useState(false);

  const posterUrl = movie.poster_path 
    ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
    : '/placeholder-movie.jpg';

  useEffect(() => {
    if (user) {
      checkIfFavorited();
    }
  }, [user, movie.id]);

  const checkIfFavorited = async () => {
    try {
      const response = await axios.get(`${API}/favorites`);
      const favorited = response.data.some(fav => fav.movie_id === movie.id);
      setIsFavorited(favorited);
    } catch (error) {
      console.error('Error checking favorite status:', error);
    }
  };

  const toggleFavorite = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user) {
      toast.error('Please login to add favorites');
      return;
    }

    setLoading(true);
    try {
      if (isFavorited) {
        await axios.delete(`${API}/favorites/${movie.id}`);
        setIsFavorited(false);
        toast.success('Removed from favorites');
      } else {
        await axios.post(`${API}/favorites`, {
          movie_id: movie.id,
          movie_title: movie.title,
          movie_poster: movie.poster_path
        });
        setIsFavorited(true);
        toast.success('Added to favorites');
      }
      
      if (onFavoriteChange) {
        onFavoriteChange();
      }
    } catch (error) {
      toast.error('Failed to update favorites');
      console.error('Error toggling favorite:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Link to={`/movie/${movie.id}`} className="block">
      <div className="bg-gray-800 rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 relative group">
        {/* Favorite Button */}
        {user && (
          <button
            onClick={toggleFavorite}
            disabled={loading}
            className="absolute top-2 right-2 z-10 p-2 rounded-full bg-black bg-opacity-50 hover:bg-opacity-75 transition-all duration-200"
          >
            {isFavorited ? (
              <HeartIcon className="h-5 w-5 text-red-500" />
            ) : (
              <HeartOutlineIcon className="h-5 w-5 text-white" />
            )}
          </button>
        )}

        {/* Movie Poster */}
        <div className="aspect-[2/3] overflow-hidden">
          <img
            src={posterUrl}
            alt={movie.title}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
            onError={(e) => {
              e.target.src = 'https://via.placeholder.com/500x750/374151/9CA3AF?text=No+Image';
            }}
          />
        </div>

        {/* Movie Info */}
        <div className="p-4">
          <h3 className="text-white font-semibold text-lg mb-2 line-clamp-2">
            {movie.title}
          </h3>
          
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-1">
              <StarIcon className="h-4 w-4 text-yellow-400" />
              <span className="text-gray-300 text-sm">
                {movie.vote_average?.toFixed(1) || 'N/A'}
              </span>
            </div>
            {movie.release_date && (
              <span className="text-gray-400 text-sm">
                {new Date(movie.release_date).getFullYear()}
              </span>
            )}
          </div>

          {movie.overview && (
            <p className="text-gray-400 text-sm line-clamp-3">
              {movie.overview}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
};

export default MovieCard;