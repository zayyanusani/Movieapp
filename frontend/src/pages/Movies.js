import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "axios";
import MovieCard from "../components/MovieCard";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Movies = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [movies, setMovies] = useState([]);
  const [genres, setGenres] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [sortBy, setSortBy] = useState("popularity.desc");
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "popular");

  useEffect(() => {
    fetchGenres();
  }, []);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab) {
      setActiveTab(tab);
    }
    fetchMovies();
  }, [activeTab, currentPage, selectedGenre, selectedYear, sortBy]);

  const fetchGenres = async () => {
    try {
      const response = await axios.get(`${API}/genres`);
      setGenres(response.data.genres || []);
    } catch (error) {
      console.error('Error fetching genres:', error);
    }
  };

  const fetchMovies = async () => {
    setLoading(true);
    try {
      let response;
      
      if (searchQuery.trim()) {
        response = await axios.get(`${API}/movies/search`, {
          params: { q: searchQuery, page: currentPage }
        });
      } else if (activeTab === "top-rated") {
        response = await axios.get(`${API}/movies/top-rated`, {
          params: { page: currentPage }
        });
      } else if (activeTab === "discover") {
        response = await axios.get(`${API}/movies/discover`, {
          params: {
            genre_id: selectedGenre || undefined,
            year: selectedYear || undefined,
            sort_by: sortBy,
            page: currentPage
          }
        });
      } else {
        // Default to popular
        response = await axios.get(`${API}/movies/popular`, {
          params: { page: currentPage }
        });
      }

      setMovies(response.data.results || []);
      setTotalPages(response.data.total_pages || 1);
    } catch (error) {
      console.error('Error fetching movies:', error);
      setMovies([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchMovies();
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setCurrentPage(1);
    setSearchParams(tab !== "popular" ? { tab } : {});
  };

  const handleFilterChange = () => {
    setCurrentPage(1);
    setActiveTab("discover");
    setSearchParams({ tab: "discover" });
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 50 }, (_, i) => currentYear - i);

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-6">Movies</h1>
          
          {/* Search Bar */}
          <form onSubmit={handleSearch} className="mb-6">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for movies..."
                className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>
          </form>

          {/* Tabs */}
          <div className="flex flex-wrap gap-4 mb-6">
            <button
              onClick={() => handleTabChange("popular")}
              className={`px-4 py-2 rounded-lg font-medium transition-colors duration-200 ${
                activeTab === "popular"
                  ? "bg-red-600 text-white"
                  : "bg-gray-800 text-gray-300 hover:bg-gray-700"
              }`}
            >
              Popular
            </button>
            <button
              onClick={() => handleTabChange("top-rated")}
              className={`px-4 py-2 rounded-lg font-medium transition-colors duration-200 ${
                activeTab === "top-rated"
                  ? "bg-red-600 text-white"
                  : "bg-gray-800 text-gray-300 hover:bg-gray-700"
              }`}
            >
              Top Rated
            </button>
            <button
              onClick={() => handleTabChange("discover")}
              className={`px-4 py-2 rounded-lg font-medium transition-colors duration-200 ${
                activeTab === "discover"
                  ? "bg-red-600 text-white"
                  : "bg-gray-800 text-gray-300 hover:bg-gray-700"
              }`}
            >
              Discover
            </button>
          </div>

          {/* Filters */}
          {activeTab === "discover" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <select
                value={selectedGenre}
                onChange={(e) => {
                  setSelectedGenre(e.target.value);
                  handleFilterChange();
                }}
                className="bg-gray-800 border border-gray-600 rounded-lg text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="">All Genres</option>
                {genres.map((genre) => (
                  <option key={genre.id} value={genre.id}>
                    {genre.name}
                  </option>
                ))}
              </select>

              <select
                value={selectedYear}
                onChange={(e) => {
                  setSelectedYear(e.target.value);
                  handleFilterChange();
                }}
                className="bg-gray-800 border border-gray-600 rounded-lg text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="">All Years</option>
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>

              <select
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value);
                  handleFilterChange();
                }}
                className="bg-gray-800 border border-gray-600 rounded-lg text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="popularity.desc">Most Popular</option>
                <option value="vote_average.desc">Highest Rated</option>
                <option value="release_date.desc">Newest</option>
                <option value="release_date.asc">Oldest</option>
              </select>
            </div>
          )}
        </div>

        {/* Movies Grid */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="spinner"></div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 mb-8">
              {movies.map((movie) => (
                <MovieCard key={movie.id} movie={movie} />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center space-x-4">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 bg-gray-800 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700 transition-colors duration-200"
                >
                  Previous
                </button>
                
                <span className="text-white">
                  Page {currentPage} of {totalPages}
                </span>
                
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 bg-gray-800 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700 transition-colors duration-200"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}

        {movies.length === 0 && !loading && (
          <div className="text-center text-gray-400 py-12">
            <p className="text-xl">No movies found</p>
            <p className="mt-2">Try adjusting your search or filters</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Movies;