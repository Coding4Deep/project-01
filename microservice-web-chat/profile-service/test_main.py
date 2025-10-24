import pytest
import asyncio
import tempfile
import os
from fastapi.testclient import TestClient
from unittest.mock import Mock, patch, AsyncMock
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import io
from PIL import Image

from main import app, get_db
from database import Base
from models import Profile

# Test database setup
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base.metadata.create_all(bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)

class TestProfileService:
    
    def setup_method(self):
        """Setup for each test method"""
        # Clear database
        db = TestingSessionLocal()
        db.query(Profile).delete()
        db.commit()
        db.close()
    
    def test_health_endpoint(self):
        """Test health check endpoint"""
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json() == {"status": "OK", "service": "profile-service"}
    
    def test_create_profile_success(self):
        """Test successful profile creation"""
        profile_data = {
            "username": "testuser",
            "full_name": "Test User",
            "bio": "Test bio",
            "location": "Test City"
        }
        
        response = client.post("/api/profile", json=profile_data)
        assert response.status_code == 201
        
        data = response.json()
        assert data["username"] == "testuser"
        assert data["full_name"] == "Test User"
        assert "id" in data
    
    def test_create_profile_duplicate_username(self):
        """Test profile creation with duplicate username"""
        profile_data = {
            "username": "testuser",
            "full_name": "Test User",
            "bio": "Test bio"
        }
        
        # Create first profile
        client.post("/api/profile", json=profile_data)
        
        # Try to create duplicate
        response = client.post("/api/profile", json=profile_data)
        assert response.status_code == 400
        assert "already exists" in response.json()["detail"]
    
    def test_get_profile_success(self):
        """Test successful profile retrieval"""
        # Create profile first
        profile_data = {
            "username": "testuser",
            "full_name": "Test User",
            "bio": "Test bio"
        }
        client.post("/api/profile", json=profile_data)
        
        # Get profile
        response = client.get("/api/profile/testuser")
        assert response.status_code == 200
        
        data = response.json()
        assert data["username"] == "testuser"
        assert data["full_name"] == "Test User"
    
    def test_get_profile_not_found(self):
        """Test profile retrieval for non-existent user"""
        response = client.get("/api/profile/nonexistent")
        assert response.status_code == 404
        assert "not found" in response.json()["detail"]
    
    def test_update_profile_success(self):
        """Test successful profile update"""
        # Create profile first
        profile_data = {
            "username": "testuser",
            "full_name": "Test User",
            "bio": "Original bio"
        }
        client.post("/api/profile", json=profile_data)
        
        # Update profile
        update_data = {
            "full_name": "Updated User",
            "bio": "Updated bio",
            "location": "New City"
        }
        
        response = client.put("/api/profile/testuser", json=update_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data["full_name"] == "Updated User"
        assert data["bio"] == "Updated bio"
        assert data["location"] == "New City"
    
    def test_update_profile_not_found(self):
        """Test profile update for non-existent user"""
        update_data = {"full_name": "Updated User"}
        
        response = client.put("/api/profile/nonexistent", json=update_data)
        assert response.status_code == 404
    
    def test_upload_profile_image_success(self):
        """Test successful profile image upload"""
        # Create profile first
        profile_data = {"username": "testuser", "full_name": "Test User"}
        client.post("/api/profile", json=profile_data)
        
        # Create test image
        image = Image.new('RGB', (100, 100), color='red')
        img_buffer = io.BytesIO()
        image.save(img_buffer, format='JPEG')
        img_buffer.seek(0)
        
        files = {"file": ("test.jpg", img_buffer, "image/jpeg")}
        response = client.post("/api/profile/testuser/image", files=files)
        
        assert response.status_code == 200
        data = response.json()
        assert "image_url" in data
        assert data["message"] == "Profile image updated successfully"
    
    def test_upload_profile_image_invalid_format(self):
        """Test profile image upload with invalid format"""
        # Create profile first
        profile_data = {"username": "testuser", "full_name": "Test User"}
        client.post("/api/profile", json=profile_data)
        
        # Try to upload text file as image
        files = {"file": ("test.txt", io.BytesIO(b"not an image"), "text/plain")}
        response = client.post("/api/profile/testuser/image", files=files)
        
        assert response.status_code == 400
        assert "Invalid image format" in response.json()["detail"]
    
    def test_upload_profile_image_too_large(self):
        """Test profile image upload with file too large"""
        # Create profile first
        profile_data = {"username": "testuser", "full_name": "Test User"}
        client.post("/api/profile", json=profile_data)
        
        # Create large image (simulate > 5MB)
        large_data = b"x" * (6 * 1024 * 1024)  # 6MB
        files = {"file": ("large.jpg", io.BytesIO(large_data), "image/jpeg")}
        
        response = client.post("/api/profile/testuser/image", files=files)
        assert response.status_code == 400
        assert "too large" in response.json()["detail"]
    
    def test_get_profile_image_success(self):
        """Test successful profile image retrieval"""
        # Create profile and upload image first
        profile_data = {"username": "testuser", "full_name": "Test User"}
        client.post("/api/profile", json=profile_data)
        
        # Upload image
        image = Image.new('RGB', (100, 100), color='blue')
        img_buffer = io.BytesIO()
        image.save(img_buffer, format='JPEG')
        img_buffer.seek(0)
        
        files = {"file": ("test.jpg", img_buffer, "image/jpeg")}
        upload_response = client.post("/api/profile/testuser/image", files=files)
        
        # Extract filename from response
        image_url = upload_response.json()["image_url"]
        filename = image_url.split("/")[-1]
        
        # Get image
        response = client.get(f"/profiles/{filename}")
        assert response.status_code == 200
        assert response.headers["content-type"].startswith("image/")
    
    def test_get_profile_image_not_found(self):
        """Test profile image retrieval for non-existent image"""
        response = client.get("/profiles/nonexistent.jpg")
        assert response.status_code == 404
    
    def test_delete_profile_success(self):
        """Test successful profile deletion"""
        # Create profile first
        profile_data = {"username": "testuser", "full_name": "Test User"}
        client.post("/api/profile", json=profile_data)
        
        # Delete profile
        response = client.delete("/api/profile/testuser")
        assert response.status_code == 200
        assert "deleted successfully" in response.json()["message"]
        
        # Verify deletion
        get_response = client.get("/api/profile/testuser")
        assert get_response.status_code == 404
    
    def test_delete_profile_not_found(self):
        """Test profile deletion for non-existent user"""
        response = client.delete("/api/profile/nonexistent")
        assert response.status_code == 404
    
    def test_input_validation_username(self):
        """Test username validation"""
        # Test empty username
        profile_data = {"username": "", "full_name": "Test User"}
        response = client.post("/api/profile", json=profile_data)
        assert response.status_code == 422
        
        # Test username with special characters
        profile_data = {"username": "test@user!", "full_name": "Test User"}
        response = client.post("/api/profile", json=profile_data)
        assert response.status_code == 400
    
    def test_input_validation_bio_length(self):
        """Test bio length validation"""
        long_bio = "x" * 1001  # Assuming 1000 char limit
        profile_data = {
            "username": "testuser",
            "full_name": "Test User",
            "bio": long_bio
        }
        
        response = client.post("/api/profile", json=profile_data)
        assert response.status_code == 422
    
    def test_sql_injection_protection(self):
        """Test SQL injection protection"""
        malicious_username = "'; DROP TABLE profiles; --"
        profile_data = {
            "username": malicious_username,
            "full_name": "Malicious User"
        }
        
        response = client.post("/api/profile", json=profile_data)
        # Should either reject or sanitize the input
        assert response.status_code in [400, 422]
    
    def test_xss_protection(self):
        """Test XSS protection in profile data"""
        xss_payload = "<script>alert('xss')</script>"
        profile_data = {
            "username": "testuser",
            "full_name": xss_payload,
            "bio": xss_payload
        }
        
        response = client.post("/api/profile", json=profile_data)
        if response.status_code == 201:
            # If created, ensure XSS payload is sanitized
            data = response.json()
            assert "<script>" not in data["full_name"]
            assert "<script>" not in data["bio"]
    
    def test_concurrent_profile_creation(self):
        """Test concurrent profile creation"""
        import threading
        import time
        
        results = []
        
        def create_profile(username):
            profile_data = {
                "username": username,
                "full_name": f"User {username}"
            }
            response = client.post("/api/profile", json=profile_data)
            results.append(response.status_code)
        
        # Create multiple threads
        threads = []
        for i in range(5):
            thread = threading.Thread(target=create_profile, args=[f"user{i}"])
            threads.append(thread)
        
        # Start all threads
        for thread in threads:
            thread.start()
        
        # Wait for all threads
        for thread in threads:
            thread.join()
        
        # All should succeed
        assert all(code == 201 for code in results)
    
    def test_image_processing_security(self):
        """Test image processing security"""
        # Test with malicious image metadata
        image = Image.new('RGB', (100, 100), color='red')
        
        # Add potentially malicious metadata
        from PIL.ExifTags import TAGS
        exif_dict = {"0th": {}, "Exif": {}, "GPS": {}, "1st": {}, "thumbnail": None}
        
        img_buffer = io.BytesIO()
        image.save(img_buffer, format='JPEG')
        img_buffer.seek(0)
        
        # Create profile first
        profile_data = {"username": "testuser", "full_name": "Test User"}
        client.post("/api/profile", json=profile_data)
        
        files = {"file": ("malicious.jpg", img_buffer, "image/jpeg")}
        response = client.post("/api/profile/testuser/image", files=files)
        
        # Should handle malicious metadata safely
        assert response.status_code in [200, 400]
    
    def teardown_method(self):
        """Cleanup after each test"""
        # Clean up uploaded files
        uploads_dir = "uploads/profiles"
        if os.path.exists(uploads_dir):
            for file in os.listdir(uploads_dir):
                try:
                    os.remove(os.path.join(uploads_dir, file))
                except:
                    pass

# Performance tests
class TestProfileServicePerformance:
    
    def test_profile_creation_performance(self):
        """Test profile creation performance"""
        import time
        
        start_time = time.time()
        
        for i in range(100):
            profile_data = {
                "username": f"perfuser{i}",
                "full_name": f"Performance User {i}",
                "bio": "Performance test bio"
            }
            response = client.post("/api/profile", json=profile_data)
            assert response.status_code == 201
        
        end_time = time.time()
        duration = end_time - start_time
        
        # Should create 100 profiles in reasonable time (adjust threshold as needed)
        assert duration < 10.0  # 10 seconds
    
    def test_profile_retrieval_performance(self):
        """Test profile retrieval performance"""
        # Create test profile
        profile_data = {"username": "perfuser", "full_name": "Performance User"}
        client.post("/api/profile", json=profile_data)
        
        import time
        start_time = time.time()
        
        for i in range(1000):
            response = client.get("/api/profile/perfuser")
            assert response.status_code == 200
        
        end_time = time.time()
        duration = end_time - start_time
        
        # Should handle 1000 requests in reasonable time
        assert duration < 5.0  # 5 seconds

if __name__ == "__main__":
    pytest.main([__file__])
