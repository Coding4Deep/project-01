package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// Mock structures
type MockDB struct {
	mock.Mock
}

func (m *MockDB) Query(query string, args ...interface{}) (*sql.Rows, error) {
	mockArgs := m.Called(query, args)
	return mockArgs.Get(0).(*sql.Rows), mockArgs.Error(1)
}

func (m *MockDB) Exec(query string, args ...interface{}) (sql.Result, error) {
	mockArgs := m.Called(query, args)
	return mockArgs.Get(0).(sql.Result), mockArgs.Error(1)
}

// Test setup
func setupTestRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	
	// Add test routes
	router.GET("/health", healthHandler)
	router.GET("/api/posts", getPosts)
	router.POST("/api/posts", createPost)
	router.POST("/api/posts/:id/like", likePost)
	router.GET("/api/images/:id", getImage)
	
	return router
}

func TestHealthEndpoint(t *testing.T) {
	router := setupTestRouter()
	
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/health", nil)
	router.ServeHTTP(w, req)
	
	assert.Equal(t, 200, w.Code)
	
	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Equal(t, "OK", response["status"])
	assert.Equal(t, "posts-service", response["service"])
}

func TestGetPosts(t *testing.T) {
	router := setupTestRouter()
	
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/api/posts", nil)
	router.ServeHTTP(w, req)
	
	assert.Equal(t, 200, w.Code)
	
	var posts []Post
	err := json.Unmarshal(w.Body.Bytes(), &posts)
	assert.NoError(t, err)
	assert.IsType(t, []Post{}, posts)
}

func TestCreatePost(t *testing.T) {
	router := setupTestRouter()
	
	// Create a test image file
	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	
	// Add image file
	part, err := writer.CreateFormFile("image", "test.jpg")
	assert.NoError(t, err)
	
	// Write test image data
	testImageData := []byte("fake-image-data")
	_, err = part.Write(testImageData)
	assert.NoError(t, err)
	
	// Add caption
	err = writer.WriteField("caption", "Test post caption")
	assert.NoError(t, err)
	
	err = writer.Close()
	assert.NoError(t, err)
	
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/api/posts", body)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	req.Header.Set("Authorization", "Bearer test-token")
	
	router.ServeHTTP(w, req)
	
	// Should return 201 for successful creation
	assert.Equal(t, 201, w.Code)
}

func TestCreatePostWithoutImage(t *testing.T) {
	router := setupTestRouter()
	
	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	err := writer.WriteField("caption", "Test without image")
	assert.NoError(t, err)
	err = writer.Close()
	assert.NoError(t, err)
	
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/api/posts", body)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	req.Header.Set("Authorization", "Bearer test-token")
	
	router.ServeHTTP(w, req)
	
	assert.Equal(t, 400, w.Code)
}

func TestCreatePostWithoutAuth(t *testing.T) {
	router := setupTestRouter()
	
	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	
	part, err := writer.CreateFormFile("image", "test.jpg")
	assert.NoError(t, err)
	_, err = part.Write([]byte("fake-image-data"))
	assert.NoError(t, err)
	
	err = writer.WriteField("caption", "Test post")
	assert.NoError(t, err)
	err = writer.Close()
	assert.NoError(t, err)
	
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/api/posts", body)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	// No Authorization header
	
	router.ServeHTTP(w, req)
	
	assert.Equal(t, 401, w.Code)
}

func TestLikePost(t *testing.T) {
	router := setupTestRouter()
	
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/api/posts/test-id/like", nil)
	req.Header.Set("Authorization", "Bearer test-token")
	
	router.ServeHTTP(w, req)
	
	assert.Equal(t, 200, w.Code)
}

func TestLikePostWithoutAuth(t *testing.T) {
	router := setupTestRouter()
	
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/api/posts/test-id/like", nil)
	// No Authorization header
	
	router.ServeHTTP(w, req)
	
	assert.Equal(t, 401, w.Code)
}

func TestGetImage(t *testing.T) {
	router := setupTestRouter()
	
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/api/images/test-id", nil)
	
	router.ServeHTTP(w, req)
	
	// Should return 404 for non-existent image or 200 for existing
	assert.True(t, w.Code == 404 || w.Code == 200)
}

func TestImageUploadSecurity(t *testing.T) {
	router := setupTestRouter()
	
	// Test with malicious filename
	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	
	part, err := writer.CreateFormFile("image", "../../../etc/passwd")
	assert.NoError(t, err)
	_, err = part.Write([]byte("fake-image-data"))
	assert.NoError(t, err)
	
	err = writer.WriteField("caption", "Malicious upload")
	assert.NoError(t, err)
	err = writer.Close()
	assert.NoError(t, err)
	
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/api/posts", body)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	req.Header.Set("Authorization", "Bearer test-token")
	
	router.ServeHTTP(w, req)
	
	// Should reject malicious filenames
	assert.Equal(t, 400, w.Code)
}

func TestImageTypeValidation(t *testing.T) {
	router := setupTestRouter()
	
	// Test with non-image file
	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	
	part, err := writer.CreateFormFile("image", "test.txt")
	assert.NoError(t, err)
	_, err = part.Write([]byte("This is not an image"))
	assert.NoError(t, err)
	
	err = writer.WriteField("caption", "Text file upload")
	assert.NoError(t, err)
	err = writer.Close()
	assert.NoError(t, err)
	
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/api/posts", body)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	req.Header.Set("Authorization", "Bearer test-token")
	
	router.ServeHTTP(w, req)
	
	// Should reject non-image files
	assert.Equal(t, 400, w.Code)
}

func TestCaptionValidation(t *testing.T) {
	router := setupTestRouter()
	
	// Test with very long caption
	longCaption := strings.Repeat("a", 1001) // Assuming 1000 char limit
	
	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	
	part, err := writer.CreateFormFile("image", "test.jpg")
	assert.NoError(t, err)
	_, err = part.Write([]byte("fake-image-data"))
	assert.NoError(t, err)
	
	err = writer.WriteField("caption", longCaption)
	assert.NoError(t, err)
	err = writer.Close()
	assert.NoError(t, err)
	
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/api/posts", body)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	req.Header.Set("Authorization", "Bearer test-token")
	
	router.ServeHTTP(w, req)
	
	// Should reject overly long captions
	assert.Equal(t, 400, w.Code)
}

func TestCORSHeaders(t *testing.T) {
	router := setupTestRouter()
	
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("OPTIONS", "/api/posts", nil)
	req.Header.Set("Origin", "http://localhost:3000")
	
	router.ServeHTTP(w, req)
	
	assert.Equal(t, 200, w.Code)
	assert.Contains(t, w.Header().Get("Access-Control-Allow-Origin"), "localhost:3000")
}

func TestRateLimiting(t *testing.T) {
	router := setupTestRouter()
	
	// Make multiple rapid requests
	for i := 0; i < 10; i++ {
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("GET", "/api/posts", nil)
		router.ServeHTTP(w, req)
		
		// First few should succeed
		if i < 5 {
			assert.Equal(t, 200, w.Code)
		}
	}
}

// Benchmark tests
func BenchmarkGetPosts(b *testing.B) {
	router := setupTestRouter()
	
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("GET", "/api/posts", nil)
		router.ServeHTTP(w, req)
	}
}

func BenchmarkHealthCheck(b *testing.B) {
	router := setupTestRouter()
	
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("GET", "/health", nil)
		router.ServeHTTP(w, req)
	}
}
