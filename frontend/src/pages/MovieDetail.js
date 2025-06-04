import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../App";
import toast from "react-hot-toast";
import { 
  StarIcon, 
  HeartIcon,
  BookmarkIcon,
  CalendarDaysIcon,
  ClockIcon
} from "@heroicons/react/24/solid";
import { HeartIcon as HeartOutlineIcon, BookmarkIcon as BookmarkOutlineIcon } from "@heroicons/react/24/outline";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const MovieDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [movie, setMovie] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFavorited, setIsFavorited] = useState(false);
  const [watchlists, setWatchlists] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [userReview, setUserReview] = useState({ rating: 0, review_text: "" });
  const [showReviewForm, setShowReviewForm] = useState(false);

  useEffect(() => {
    fetchMovieDetails();
    if (user) {
      checkFavoriteStatus();
      fetchWatchlists();
      fetchReviews();
    }
  }, [id, user]);

  const fetchMovieDetails = async () => {
    try {
      const response = await axios.get(`${API}/movies/${id}`);
      setMovie(response.data);
    } catch (error) {
      console.error('Error fetching movie details:', error);
      toast.error('Failed to load movie details');
    } finally {
      setLoading(false);
    }
  };

  const checkFavoriteStatus = async () => {
    try {
      const response = await axios.get(`${API}/favorites`);
      const favorited = response.data.some(fav => fav.movie_id === parseInt(id));
      setIsFavorited(favorited);
    } catch (error) {
      console.error('Error checking favorite status:', error);
    }
  };

  const fetchWatchlists = async () => {
    try {
      const response = await axios.get(`${API}/watchlists`);
      setWatchlists(response.data);
    } catch (error) {
      console.error('Error fetching watchlists:', error);
    }
  };

  const fetchReviews = async () => {
    try {
      const response = await axios.get(`${API}/reviews/movie/${id}`);
      setReviews(response.data);
      
      // Check if user has already reviewed this movie
      const existingReview = response.data.find(review => review.user_id === user.id);
      if (existingReview) {
        setUserReview({
          rating: existingReview.rating,
          review_text: existingReview.review_text || ""
        });
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
    }
  };

  const toggleFavorite = async () => {
    if (!user) {
      toast.error('Please login to add favorites');
      return;
    }

    try {
      if (isFavorited) {
        await axios.delete(`${API}/favorites/${id}`);
        setIsFavorited(false);
        toast.success('Removed from favorites');
      } else {
        await axios.post(`${API}/favorites`, {
          movie_id: parseInt(id),
          movie_title: movie.title,
          movie_poster: movie.poster_path
        });
        setIsFavorited(true);
        toast.success('Added to favorites');
      }
    } catch (error) {
      toast.error('Failed to update favorites');
    }
  };

  const addToWatchlist = async (watchlistId) => {
    try {
      await axios.post(`${API}/watchlists/${watchlistId}/movies`, {
        movie_id: parseInt(id),
        movie_title: movie.title,
        movie_poster: movie.poster_path
      });
      toast.success('Added to watchlist');
    } catch (error) {
      if (error.response?.status === 400) {
        toast.error('Movie already in watchlist');
      } else {
        toast.error('Failed to add to watchlist');
      }
    }
  };

  const submitReview = async () => {
    if (!user) {
      toast.error('Please login to submit a review');
      return;
    }

    if (userReview.rating === 0) {
      toast.error('Please provide a rating');
      return;
    }

    try {
      await axios.post(`${API}/reviews`, {
        movie_id: parseInt(id),
        rating: userReview.rating,
        review_text: userReview.review_text
      });
      toast.success('Review submitted successfully');
      setShowReviewForm(false);
      fetchReviews();
    } catch (error) {
      toast.error('Failed to submit review');
    }
  };

  const formatRuntime = (minutes) => {
    if (!minutes) return 'N/A';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Movie not found</div>
      </div>
    );
  }

  const backdropUrl = movie.backdrop_path 
    ? `https://image.tmdb.org/t/p/original${movie.backdrop_path}`
    : null;

  const posterUrl = movie.poster_path 
    ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
    : 'https://via.placeholder.com/500x750/374151/9CA3AF?text=No+Image';

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Hero Section with Backdrop */}
      <div className="relative h-96 overflow-hidden">
        {backdropUrl && (
          <img
            src={backdropUrl}
            alt={movie.title}
            className="w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-black bg-opacity-60"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-32 relative z-10">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Movie Poster */}
          <div className="lg:w-1/3">
            <img
              src={posterUrl}
              alt={movie.title}
              className="w-full max-w-sm mx-auto lg:mx-0 rounded-lg shadow-2xl"
            />
          </div>

          {/* Movie Details */}
          <div className="lg:w-2/3 text-white">
            <h1 className="text-4xl lg:text-5xl font-bold mb-4">{movie.title}</h1>
            
            {movie.tagline && (
              <p className="text-xl text-gray-300 italic mb-4">{movie.tagline}</p>
            )}

            {/* Rating and Basic Info */}
            <div className="flex flex-wrap items-center gap-6 mb-6">
              <div className="flex items-center space-x-1">
                <StarIcon className="h-5 w-5 text-yellow-400" />
                <span className="text-lg font-semibold">
                  {movie.vote_average?.toFixed(1)}/10
                </span>
                <span className="text-gray-400">({movie.vote_count} votes)</span>
              </div>
              
              {movie.release_date && (
                <div className="flex items-center space-x-1">
                  <CalendarDaysIcon className="h-5 w-5 text-gray-400" />
                  <span>{new Date(movie.release_date).getFullYear()}</span>
                </div>
              )}
              
              {movie.runtime && (
                <div className="flex items-center space-x-1">
                  <ClockIcon className="h-5 w-5 text-gray-400" />
                  <span>{formatRuntime(movie.runtime)}</span>
                </div>
              )}
            </div>

            {/* Genres */}
            {movie.genres && movie.genres.length > 0 && (
              <div className="mb-6">
                <div className="flex flex-wrap gap-2">
                  {movie.genres.map((genre) => (
                    <span
                      key={genre.id}
                      className="px-3 py-1 bg-gray-800 rounded-full text-sm"
                    >
                      {genre.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            {user && (
              <div className="flex flex-wrap gap-4 mb-6">
                <button
                  onClick={toggleFavorite}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors duration-200 ${
                    isFavorited 
                      ? 'bg-red-600 hover:bg-red-700' 
                      : 'bg-gray-800 hover:bg-gray-700'
                  }`}
                >
                  {isFavorited ? (
                    <HeartIcon className="h-5 w-5" />
                  ) : (
                    <HeartOutlineIcon className="h-5 w-5" />
                  )}
                  <span>{isFavorited ? 'Remove from Favorites' : 'Add to Favorites'}</span>
                </button>

                {watchlists.length > 0 && (
                  <div className="relative group">
                    <button className="flex items-center space-x-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors duration-200">
                      <BookmarkOutlineIcon className="h-5 w-5" />
                      <span>Add to Watchlist</span>
                    </button>
                    <div className="absolute top-full left-0 mt-2 w-48 bg-gray-800 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-20">
                      {watchlists.map((watchlist) => (
                        <button
                          key={watchlist.id}
                          onClick={() => addToWatchlist(watchlist.id)}
                          className="block w-full text-left px-4 py-2 hover:bg-gray-700 first:rounded-t-lg last:rounded-b-lg transition-colors duration-200"
                        >
                          {watchlist.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  onClick={() => setShowReviewForm(!showReviewForm)}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors duration-200"
                >
                  <StarIcon className="h-5 w-5" />
                  <span>Rate & Review</span>
                </button>
              </div>
            )}

            {/* Overview */}
            {movie.overview && (
              <div className="mb-6">
                <h3 className="text-xl font-semibold mb-2">Overview</h3>
                <p className="text-gray-300 leading-relaxed">{movie.overview}</p>
              </div>
            )}

            {/* Additional Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {movie.budget > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-300">Budget</h4>
                  <p>{formatCurrency(movie.budget)}</p>
                </div>
              )}
              
              {movie.revenue > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-300">Revenue</h4>
                  <p>{formatCurrency(movie.revenue)}</p>
                </div>
              )}
              
              {movie.production_companies && movie.production_companies.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-300">Production Companies</h4>
                  <p>{movie.production_companies.map(company => company.name).join(', ')}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Review Form */}
        {showReviewForm && user && (
          <div className="mt-8 bg-gray-800 rounded-lg p-6">
            <h3 className="text-xl font-semibold text-white mb-4">Rate & Review</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Rating (0-10)
                </label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  step="0.1"
                  value={userReview.rating}
                  onChange={(e) => setUserReview({...userReview, rating: parseFloat(e.target.value) || 0})}
                  className="w-32 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Review (Optional)
                </label>
                <textarea
                  value={userReview.review_text}
                  onChange={(e) => setUserReview({...userReview, review_text: e.target.value})}
                  rows="4"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Share your thoughts about this movie..."
                />
              </div>
              
              <div className="flex gap-4">
                <button
                  onClick={submitReview}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200"
                >
                  Submit Review
                </button>
                <button
                  onClick={() => setShowReviewForm(false)}
                  className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors duration-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Reviews Section */}
        {reviews.length > 0 && (
          <div className="mt-8">
            <h3 className="text-2xl font-semibold text-white mb-6">User Reviews</h3>
            <div className="space-y-4">
              {reviews.map((review) => (
                <div key={review.id} className="bg-gray-800 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-1">
                        <StarIcon className="h-5 w-5 text-yellow-400" />
                        <span className="text-white font-semibold">{review.rating}/10</span>
                      </div>
                    </div>
                    <span className="text-gray-400 text-sm">
                      {new Date(review.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  {review.review_text && (
                    <p className="text-gray-300">{review.review_text}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MovieDetail;