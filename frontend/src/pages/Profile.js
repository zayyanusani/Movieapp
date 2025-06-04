import { useState, useEffect } from "react";
import { useAuth } from "../App";
import axios from "axios";
import { UserIcon, FilmIcon, HeartIcon, StarIcon } from "@heroicons/react/24/outline";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Profile = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    favoriteCount: 0,
    watchlistCount: 0,
    reviewCount: 0
  });
  const [recentReviews, setRecentReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    try {
      const [favoritesResponse, watchlistsResponse, reviewsResponse] = await Promise.all([
        axios.get(`${API}/favorites`),
        axios.get(`${API}/watchlists`),
        axios.get(`${API}/reviews/user`)
      ]);

      setStats({
        favoriteCount: favoritesResponse.data.length,
        watchlistCount: watchlistsResponse.data.length,
        reviewCount: reviewsResponse.data.length
      });

      setRecentReviews(reviewsResponse.data.slice(0, 5));
    } catch (error) {
      console.error('Error fetching profile data:', error);
    } finally {
      setLoading(false);
    }
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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Header */}
        <div className="bg-gray-800 rounded-lg p-8 mb-8">
          <div className="flex items-center space-x-6">
            <div className="bg-red-600 rounded-full p-4">
              <UserIcon className="h-12 w-12 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">{user.name}</h1>
              <p className="text-gray-300">{user.email}</p>
              <p className="text-gray-400 text-sm">
                Member since {new Date(user.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gray-800 rounded-lg p-6 text-center">
            <HeartIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-white">{stats.favoriteCount}</h3>
            <p className="text-gray-300">Favorite Movies</p>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-6 text-center">
            <FilmIcon className="h-12 w-12 text-blue-500 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-white">{stats.watchlistCount}</h3>
            <p className="text-gray-300">Watchlists</p>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-6 text-center">
            <StarIcon className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-white">{stats.reviewCount}</h3>
            <p className="text-gray-300">Reviews</p>
          </div>
        </div>

        {/* Recent Reviews */}
        {recentReviews.length > 0 && (
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-2xl font-bold text-white mb-6">Recent Reviews</h2>
            <div className="space-y-4">
              {recentReviews.map((review) => (
                <div key={review.id} className="border-b border-gray-700 pb-4 last:border-b-0 last:pb-0">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold text-white">Movie ID: {review.movie_id}</h3>
                    <div className="flex items-center space-x-1">
                      <StarIcon className="h-5 w-5 text-yellow-400" />
                      <span className="text-white font-semibold">{review.rating}/10</span>
                    </div>
                  </div>
                  {review.review_text && (
                    <p className="text-gray-300 mb-2">{review.review_text}</p>
                  )}
                  <p className="text-gray-400 text-sm">
                    {new Date(review.created_at).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <a
            href="/favorites"
            className="bg-red-600 hover:bg-red-700 text-white p-6 rounded-lg text-center transition-colors duration-200"
          >
            <HeartIcon className="h-8 w-8 mx-auto mb-2" />
            <h3 className="text-lg font-semibold">View Favorites</h3>
            <p className="text-red-100">See all your favorite movies</p>
          </a>
          
          <a
            href="/watchlists"
            className="bg-blue-600 hover:bg-blue-700 text-white p-6 rounded-lg text-center transition-colors duration-200"
          >
            <FilmIcon className="h-8 w-8 mx-auto mb-2" />
            <h3 className="text-lg font-semibold">Manage Watchlists</h3>
            <p className="text-blue-100">Organize your movie collections</p>
          </a>
        </div>
      </div>
    </div>
  );
};

export default Profile;