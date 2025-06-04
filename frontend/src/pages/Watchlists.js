import { useState, useEffect } from "react";
import { useAuth } from "../App";
import axios from "axios";
import toast from "react-hot-toast";
import { 
  BookmarkIcon, 
  PlusIcon, 
  TrashIcon,
  XMarkIcon 
} from "@heroicons/react/24/outline";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Watchlists = () => {
  const { user } = useAuth();
  const [watchlists, setWatchlists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newWatchlist, setNewWatchlist] = useState({ name: "", description: "" });

  useEffect(() => {
    fetchWatchlists();
  }, []);

  const fetchWatchlists = async () => {
    try {
      const response = await axios.get(`${API}/watchlists`);
      setWatchlists(response.data);
    } catch (error) {
      console.error('Error fetching watchlists:', error);
    } finally {
      setLoading(false);
    }
  };

  const createWatchlist = async (e) => {
    e.preventDefault();
    
    if (!newWatchlist.name.trim()) {
      toast.error('Please enter a watchlist name');
      return;
    }

    try {
      await axios.post(`${API}/watchlists`, {
        name: newWatchlist.name,
        description: newWatchlist.description
      });
      
      toast.success('Watchlist created successfully');
      setNewWatchlist({ name: "", description: "" });
      setShowCreateForm(false);
      fetchWatchlists();
    } catch (error) {
      toast.error('Failed to create watchlist');
    }
  };

  const removeMovieFromWatchlist = async (watchlistId, movieId) => {
    try {
      await axios.delete(`${API}/watchlists/${watchlistId}/movies/${movieId}`);
      toast.success('Movie removed from watchlist');
      fetchWatchlists();
    } catch (error) {
      toast.error('Failed to remove movie');
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <BookmarkIcon className="h-8 w-8 text-blue-500" />
              <h1 className="text-4xl font-bold text-white">My Watchlists</h1>
            </div>
            <button
              onClick={() => setShowCreateForm(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200"
            >
              <PlusIcon className="h-5 w-5" />
              <span>Create Watchlist</span>
            </button>
          </div>
          <p className="text-gray-400 mt-2">
            {watchlists.length} watchlist{watchlists.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Create Watchlist Modal */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-white">Create New Watchlist</h2>
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              
              <form onSubmit={createWatchlist}>
                <div className="space-y-4">
                  <div>
                    <label className="form-label">Name</label>
                    <input
                      type="text"
                      value={newWatchlist.name}
                      onChange={(e) => setNewWatchlist({...newWatchlist, name: e.target.value})}
                      className="form-input"
                      placeholder="Enter watchlist name"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="form-label">Description (Optional)</label>
                    <textarea
                      value={newWatchlist.description}
                      onChange={(e) => setNewWatchlist({...newWatchlist, description: e.target.value})}
                      className="form-input"
                      placeholder="Enter description"
                      rows="3"
                    />
                  </div>
                  
                  <div className="flex gap-4">
                    <button
                      type="submit"
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors duration-200"
                    >
                      Create
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCreateForm(false)}
                      className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg transition-colors duration-200"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Watchlists Grid */}
        {watchlists.length === 0 ? (
          <div className="text-center py-12">
            <BookmarkIcon className="h-24 w-24 text-gray-600 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-white mb-2">No watchlists yet</h2>
            <p className="text-gray-400 mb-6">
              Create your first watchlist to organize your movies
            </p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Create Watchlist
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {watchlists.map((watchlist) => (
              <div key={watchlist.id} className="bg-gray-800 rounded-lg p-6">
                <div className="mb-4">
                  <h3 className="text-xl font-semibold text-white mb-2">
                    {watchlist.name}
                  </h3>
                  {watchlist.description && (
                    <p className="text-gray-400 text-sm">{watchlist.description}</p>
                  )}
                  <p className="text-gray-500 text-sm mt-1">
                    {watchlist.movies.length} movie{watchlist.movies.length !== 1 ? 's' : ''}
                  </p>
                </div>

                {/* Movies in Watchlist */}
                {watchlist.movies.length > 0 ? (
                  <div className="space-y-3">
                    {watchlist.movies.slice(0, 3).map((movie) => (
                      <div key={movie.id} className="flex items-center justify-between bg-gray-700 rounded p-3">
                        <div className="flex items-center space-x-3">
                          {movie.movie_poster && (
                            <img
                              src={`https://image.tmdb.org/t/p/w92${movie.movie_poster}`}
                              alt={movie.movie_title}
                              className="w-10 h-15 object-cover rounded"
                              onError={(e) => {
                                e.target.src = 'https://via.placeholder.com/92x138/374151/9CA3AF?text=No+Image';
                              }}
                            />
                          )}
                          <div>
                            <p className="text-white text-sm font-medium">{movie.movie_title}</p>
                            <p className="text-gray-400 text-xs">
                              Added {new Date(movie.added_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => removeMovieFromWatchlist(watchlist.id, movie.movie_id)}
                          className="text-red-400 hover:text-red-300 p-1"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    
                    {watchlist.movies.length > 3 && (
                      <p className="text-gray-400 text-sm text-center">
                        +{watchlist.movies.length - 3} more movie{watchlist.movies.length - 3 !== 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <BookmarkIcon className="h-12 w-12 text-gray-600 mx-auto mb-2" />
                    <p className="text-gray-400 text-sm">No movies in this watchlist yet</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Watchlists;