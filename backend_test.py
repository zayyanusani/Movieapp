
import requests
import sys
import uuid
import time
import json
from datetime import datetime

class MovieAppTester:
    def __init__(self, base_url="https://87e89f0f-2b5a-4dd4-a4e6-f361f2e23580.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_user_email = f"test_user_{uuid.uuid4().hex[:8]}@example.com"
        self.test_password = "Test123!"
        self.test_name = "Test User"
        self.watchlist_id = None
        self.movie_id = None  # Will store a movie ID for testing

    def run_test(self, name, method, endpoint, expected_status, data=None, params=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)
            
            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                if response.text:
                    try:
                        return success, response.json()
                    except json.JSONDecodeError:
                        return success, response.text
                return success, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"Response: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_register(self):
        """Test user registration"""
        success, response = self.run_test(
            "User Registration",
            "POST",
            "auth/register",
            200,
            data={"email": self.test_user_email, "password": self.test_password, "name": self.test_name}
        )
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.user_id = response['user']['id']
            print(f"Created test user: {self.test_user_email}")
            return True
        return False

    def test_login(self):
        """Test user login"""
        success, response = self.run_test(
            "User Login",
            "POST",
            "auth/login",
            200,
            data={"email": self.test_user_email, "password": self.test_password}
        )
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.user_id = response['user']['id']
            return True
        return False

    def test_get_current_user(self):
        """Test getting current user info"""
        success, response = self.run_test(
            "Get Current User",
            "GET",
            "auth/me",
            200
        )
        return success

    def test_search_movies(self):
        """Test movie search"""
        success, response = self.run_test(
            "Search Movies",
            "GET",
            "movies/search",
            200,
            params={"q": "Avengers"}
        )
        if success and 'results' in response and len(response['results']) > 0:
            self.movie_id = response['results'][0]['id']
            return True
        return False

    def test_get_popular_movies(self):
        """Test getting popular movies"""
        success, response = self.run_test(
            "Get Popular Movies",
            "GET",
            "movies/popular",
            200
        )
        if success and not self.movie_id and 'results' in response and len(response['results']) > 0:
            self.movie_id = response['results'][0]['id']
        return success

    def test_get_top_rated_movies(self):
        """Test getting top rated movies"""
        return self.run_test(
            "Get Top Rated Movies",
            "GET",
            "movies/top-rated",
            200
        )[0]

    def test_discover_movies(self):
        """Test movie discovery"""
        return self.run_test(
            "Discover Movies",
            "GET",
            "movies/discover",
            200,
            params={"sort_by": "popularity.desc"}
        )[0]

    def test_get_movie_details(self):
        """Test getting movie details"""
        if not self.movie_id:
            print("❌ No movie ID available for testing")
            return False
        
        return self.run_test(
            "Get Movie Details",
            "GET",
            f"movies/{self.movie_id}",
            200
        )[0]

    def test_get_genres(self):
        """Test getting movie genres"""
        return self.run_test(
            "Get Genres",
            "GET",
            "genres",
            200
        )[0]

    def test_add_to_favorites(self):
        """Test adding a movie to favorites"""
        if not self.movie_id:
            print("❌ No movie ID available for testing")
            return False
        
        success, response = self.run_test(
            "Add to Favorites",
            "POST",
            "favorites",
            200,
            data={"movie_id": self.movie_id, "movie_title": "Test Movie", "movie_poster": "/test.jpg"}
        )
        return success

    def test_get_favorites(self):
        """Test getting user favorites"""
        success, response = self.run_test(
            "Get Favorites",
            "GET",
            "favorites",
            200
        )
        return success

    def test_remove_from_favorites(self):
        """Test removing a movie from favorites"""
        if not self.movie_id:
            print("❌ No movie ID available for testing")
            return False
        
        return self.run_test(
            "Remove from Favorites",
            "DELETE",
            f"favorites/{self.movie_id}",
            200
        )[0]

    def test_create_watchlist(self):
        """Test creating a watchlist"""
        success, response = self.run_test(
            "Create Watchlist",
            "POST",
            "watchlists?name=Test%20Watchlist&description=A%20test%20watchlist",
            200,
            data={}
        )
        if success and 'id' in response:
            self.watchlist_id = response['id']
            return True
        return False

    def test_get_watchlists(self):
        """Test getting user watchlists"""
        return self.run_test(
            "Get Watchlists",
            "GET",
            "watchlists",
            200
        )[0]

    def test_add_to_watchlist(self):
        """Test adding a movie to a watchlist"""
        if not self.movie_id or not self.watchlist_id:
            print("❌ No movie ID or watchlist ID available for testing")
            return False
        
        return self.run_test(
            "Add to Watchlist",
            "POST",
            f"watchlists/{self.watchlist_id}/movies",
            200,
            data={"movie_id": self.movie_id, "movie_title": "Test Movie", "movie_poster": "/test.jpg"}
        )[0]

    def test_remove_from_watchlist(self):
        """Test removing a movie from a watchlist"""
        if not self.movie_id or not self.watchlist_id:
            print("❌ No movie ID or watchlist ID available for testing")
            return False
        
        return self.run_test(
            "Remove from Watchlist",
            "DELETE",
            f"watchlists/{self.watchlist_id}/movies/{self.movie_id}",
            200
        )[0]

    def test_create_review(self):
        """Test creating a movie review"""
        if not self.movie_id:
            print("❌ No movie ID available for testing")
            return False
        
        return self.run_test(
            "Create Review",
            "POST",
            "reviews",
            200,
            data={"movie_id": self.movie_id, "rating": 8.5, "review_text": "This is a test review"}
        )[0]

    def test_get_user_reviews(self):
        """Test getting user reviews"""
        return self.run_test(
            "Get User Reviews",
            "GET",
            "reviews/user",
            200
        )[0]

    def test_get_movie_reviews(self):
        """Test getting movie reviews"""
        if not self.movie_id:
            print("❌ No movie ID available for testing")
            return False
        
        return self.run_test(
            "Get Movie Reviews",
            "GET",
            f"reviews/movie/{self.movie_id}",
            200
        )[0]

    def test_get_recommendations(self):
        """Test getting movie recommendations"""
        return self.run_test(
            "Get Recommendations",
            "GET",
            "recommendations",
            200
        )[0]

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting Movie Recommendation App API Tests")
        print(f"Base URL: {self.base_url}")
        print(f"Test User: {self.test_user_email}")
        
        # Authentication tests
        if not self.test_register():
            print("❌ Registration failed, stopping tests")
            return
        
        if not self.test_get_current_user():
            print("❌ Getting user info failed")
        
        # Logout and test login
        self.token = None
        if not self.test_login():
            print("❌ Login failed, stopping tests")
            return
        
        # Movie data tests
        self.test_search_movies()
        self.test_get_popular_movies()
        self.test_get_top_rated_movies()
        self.test_discover_movies()
        self.test_get_movie_details()
        self.test_get_genres()
        
        # User data tests
        self.test_add_to_favorites()
        self.test_get_favorites()
        self.test_remove_from_favorites()
        
        self.test_create_watchlist()
        self.test_get_watchlists()
        self.test_add_to_watchlist()
        self.test_remove_from_watchlist()
        
        self.test_create_review()
        self.test_get_user_reviews()
        self.test_get_movie_reviews()
        
        self.test_get_recommendations()
        
        # Print results
        print(f"\n📊 Tests passed: {self.tests_passed}/{self.tests_run} ({self.tests_passed/self.tests_run*100:.1f}%)")
        
        if self.tests_passed == self.tests_run:
            print("✅ All tests passed!")
        else:
            print(f"❌ {self.tests_run - self.tests_passed} tests failed")

if __name__ == "__main__":
    tester = MovieAppTester()
    tester.run_all_tests()
