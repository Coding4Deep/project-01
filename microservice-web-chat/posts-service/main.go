package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/go-redis/redis/v8"
	"github.com/google/uuid"
	_ "github.com/lib/pq"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type Post struct {
	ID          int       `json:"id" db:"id"`
	UserID      int       `json:"user_id" db:"user_id"`
	Username    string    `json:"username" db:"username"`
	Caption     string    `json:"caption" db:"caption"`
	ImageURL    string    `json:"image_url" db:"image_url"`
	ImageID     string    `json:"image_id" db:"image_id"`
	LikesCount  int       `json:"likes_count" db:"likes_count"`
	CreatedAt   time.Time `json:"created_at" db:"created_at"`
	UpdatedAt   time.Time `json:"updated_at" db:"updated_at"`
}

type Like struct {
	ID     int `json:"id" db:"id"`
	PostID int `json:"post_id" db:"post_id"`
	UserID int `json:"user_id" db:"user_id"`
}

type ImageData struct {
	ID       string    `bson:"_id"`
	Data     []byte    `bson:"data"`
	Filename string    `bson:"filename"`
	MimeType string    `bson:"mime_type"`
	Size     int64     `bson:"size"`
	UploadedAt time.Time `bson:"uploaded_at"`
}

var (
	db          *sql.DB
	redisClient *redis.Client
	mongoClient *mongo.Client
	imagesCollection *mongo.Collection
)

func main() {
	initDB()
	initRedis()
	initMongo()
	
	r := gin.Default()
	r.Use(corsMiddleware())
	
	// Routes
	r.GET("/health", healthCheck)
	r.POST("/api/posts", authMiddleware(), createPost)
	r.GET("/api/posts", getPosts)
	r.GET("/api/posts/:id", getPost)
	r.POST("/api/posts/:id/like", authMiddleware(), toggleLike)
	r.GET("/api/posts/user/:username", getUserPosts)
	r.GET("/api/images/:id", getImage)
	
	port := os.Getenv("PORT")
	if port == "" {
		port = "8083"
	}
	
	log.Printf("Posts service starting on port %s", port)
	r.Run(":" + port)
}

func initDB() {
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "postgres://postgres:password@postgres:5432/userdb?sslmode=disable"
	}
	
	var err error
	db, err = sql.Open("postgres", dbURL)
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}
	
	createTables()
	log.Println("Connected to PostgreSQL")
}

func initRedis() {
	redisURL := os.Getenv("REDIS_URL")
	if redisURL == "" {
		redisURL = "redis:6379"
	}
	
	redisClient = redis.NewClient(&redis.Options{
		Addr: redisURL,
	})
	
	ctx := context.Background()
	_, err := redisClient.Ping(ctx).Result()
	if err != nil {
		log.Printf("Redis connection failed: %v", err)
	} else {
		log.Println("Connected to Redis")
	}
}

func initMongo() {
	mongoURI := os.Getenv("MONGODB_URI")
	if mongoURI == "" {
		mongoURI = "mongodb://mongodb:27017"
	}
	
	var err error
	mongoClient, err = mongo.Connect(context.Background(), options.Client().ApplyURI(mongoURI))
	if err != nil {
		log.Fatal("Failed to connect to MongoDB:", err)
	}
	
	imagesCollection = mongoClient.Database("postsdb").Collection("images")
	log.Println("Connected to MongoDB")
}

func createTables() {
	queries := []string{
		`CREATE TABLE IF NOT EXISTS posts (
			id SERIAL PRIMARY KEY,
			user_id INTEGER NOT NULL,
			username VARCHAR(255) NOT NULL,
			caption TEXT,
			image_url VARCHAR(500),
			image_id VARCHAR(255),
			likes_count INTEGER DEFAULT 0,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE TABLE IF NOT EXISTS post_likes (
			id SERIAL PRIMARY KEY,
			post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
			user_id INTEGER NOT NULL,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			UNIQUE(post_id, user_id)
		)`,
	}
	
	for _, query := range queries {
		if _, err := db.Exec(query); err != nil {
			log.Printf("Error creating table: %v", err)
		}
	}
}

func corsMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Authorization")
		
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		
		c.Next()
	}
}

func authMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(401, gin.H{"error": "Authorization header required"})
			c.Abort()
			return
		}
		
		tokenString := strings.Replace(authHeader, "Bearer ", "", 1)
		
		// Verify token with user service
		userServiceURL := os.Getenv("USER_SERVICE_URL")
		if userServiceURL == "" {
			userServiceURL = "http://user-service:8080"
		}
		
		req, _ := http.NewRequest("GET", userServiceURL+"/api/users/validate", nil)
		req.Header.Set("Authorization", "Bearer "+tokenString)
		
		client := &http.Client{Timeout: 5 * time.Second}
		resp, err := client.Do(req)
		if err != nil || resp.StatusCode != 200 {
			c.JSON(401, gin.H{"error": "Invalid token"})
			c.Abort()
			return
		}
		
		var result map[string]interface{}
		json.NewDecoder(resp.Body).Decode(&result)
		
		// Safe type conversion
		userID := 0
		username := ""
		
		if uid, ok := result["userId"]; ok && uid != nil {
			if uidFloat, ok := uid.(float64); ok {
				userID = int(uidFloat)
			}
		}
		
		if uname, ok := result["username"]; ok && uname != nil {
			if unameStr, ok := uname.(string); ok {
				username = unameStr
			}
		}
		
		if userID == 0 || username == "" {
			c.JSON(401, gin.H{"error": "Invalid token data"})
			c.Abort()
			return
		}
		
		c.Set("user_id", userID)
		c.Set("username", username)
		c.Next()
	}
}

func healthCheck(c *gin.Context) {
	c.JSON(200, gin.H{
		"status":    "OK",
		"service":   "posts-service",
		"timestamp": time.Now(),
	})
}

func createPost(c *gin.Context) {
	userID := c.GetInt("user_id")
	username := c.GetString("username")
	
	file, header, err := c.Request.FormFile("image")
	if err != nil {
		c.JSON(400, gin.H{"error": "Image file required"})
		return
	}
	defer file.Close()
	
	caption := c.PostForm("caption")
	
	// Read image data
	imageData, err := io.ReadAll(file)
	if err != nil {
		c.JSON(500, gin.H{"error": "Failed to read image"})
		return
	}
	
	// Store image in MongoDB
	imageID := uuid.New().String()
	imageDoc := ImageData{
		ID:       imageID,
		Data:     imageData,
		Filename: header.Filename,
		MimeType: header.Header.Get("Content-Type"),
		Size:     header.Size,
		UploadedAt: time.Now(),
	}
	
	_, err = imagesCollection.InsertOne(context.Background(), imageDoc)
	if err != nil {
		c.JSON(500, gin.H{"error": "Failed to store image"})
		return
	}
	
	// Create post record
	imageURL := fmt.Sprintf("/api/images/%s", imageID)
	
	query := `INSERT INTO posts (user_id, username, caption, image_url, image_id) 
			  VALUES ($1, $2, $3, $4, $5) RETURNING id, created_at`
	
	var post Post
	err = db.QueryRow(query, userID, username, caption, imageURL, imageID).Scan(&post.ID, &post.CreatedAt)
	if err != nil {
		c.JSON(500, gin.H{"error": "Failed to create post"})
		return
	}
	
	post.UserID = userID
	post.Username = username
	post.Caption = caption
	post.ImageURL = imageURL
	post.ImageID = imageID
	
	// Clear cache
	redisClient.Del(context.Background(), "posts:all", "posts:user:"+username)
	
	c.JSON(201, post)
}

func getPosts(c *gin.Context) {
	// Try cache first
	cached, err := redisClient.Get(context.Background(), "posts:all").Result()
	if err == nil {
		var posts []Post
		json.Unmarshal([]byte(cached), &posts)
		c.JSON(200, posts)
		return
	}
	
	query := `SELECT id, user_id, username, caption, image_url, image_id, likes_count, created_at, updated_at 
			  FROM posts ORDER BY created_at DESC LIMIT 50`
	
	rows, err := db.Query(query)
	if err != nil {
		c.JSON(500, gin.H{"error": "Failed to fetch posts"})
		return
	}
	defer rows.Close()
	
	var posts []Post
	for rows.Next() {
		var post Post
		err := rows.Scan(&post.ID, &post.UserID, &post.Username, &post.Caption, 
						&post.ImageURL, &post.ImageID, &post.LikesCount, &post.CreatedAt, &post.UpdatedAt)
		if err != nil {
			continue
		}
		posts = append(posts, post)
	}
	
	// Cache for 5 minutes
	postsJSON, _ := json.Marshal(posts)
	redisClient.Set(context.Background(), "posts:all", postsJSON, 5*time.Minute)
	
	c.JSON(200, posts)
}

func getPost(c *gin.Context) {
	id := c.Param("id")
	
	query := `SELECT id, user_id, username, caption, image_url, image_id, likes_count, created_at, updated_at 
			  FROM posts WHERE id = $1`
	
	var post Post
	err := db.QueryRow(query, id).Scan(&post.ID, &post.UserID, &post.Username, &post.Caption,
									  &post.ImageURL, &post.ImageID, &post.LikesCount, &post.CreatedAt, &post.UpdatedAt)
	if err != nil {
		c.JSON(404, gin.H{"error": "Post not found"})
		return
	}
	
	c.JSON(200, post)
}

func getUserPosts(c *gin.Context) {
	username := c.Param("username")
	
	// Try cache first
	cacheKey := "posts:user:" + username
	cached, err := redisClient.Get(context.Background(), cacheKey).Result()
	if err == nil {
		var posts []Post
		json.Unmarshal([]byte(cached), &posts)
		c.JSON(200, posts)
		return
	}
	
	query := `SELECT id, user_id, username, caption, image_url, image_id, likes_count, created_at, updated_at 
			  FROM posts WHERE username = $1 ORDER BY created_at DESC`
	
	rows, err := db.Query(query, username)
	if err != nil {
		c.JSON(500, gin.H{"error": "Failed to fetch user posts"})
		return
	}
	defer rows.Close()
	
	var posts []Post
	for rows.Next() {
		var post Post
		err := rows.Scan(&post.ID, &post.UserID, &post.Username, &post.Caption,
						&post.ImageURL, &post.ImageID, &post.LikesCount, &post.CreatedAt, &post.UpdatedAt)
		if err != nil {
			continue
		}
		posts = append(posts, post)
	}
	
	// Cache for 2 minutes
	postsJSON, _ := json.Marshal(posts)
	redisClient.Set(context.Background(), cacheKey, postsJSON, 2*time.Minute)
	
	c.JSON(200, posts)
}

func toggleLike(c *gin.Context) {
	userID := c.GetInt("user_id")
	postID := c.Param("id")
	
	// Check if already liked
	var existingLike int
	err := db.QueryRow("SELECT id FROM post_likes WHERE post_id = $1 AND user_id = $2", postID, userID).Scan(&existingLike)
	
	if err == sql.ErrNoRows {
		// Add like
		_, err = db.Exec("INSERT INTO post_likes (post_id, user_id) VALUES ($1, $2)", postID, userID)
		if err != nil {
			c.JSON(500, gin.H{"error": "Failed to add like"})
			return
		}
		
		// Update likes count
		db.Exec("UPDATE posts SET likes_count = likes_count + 1 WHERE id = $1", postID)
		c.JSON(200, gin.H{"liked": true})
	} else {
		// Remove like
		_, err = db.Exec("DELETE FROM post_likes WHERE post_id = $1 AND user_id = $2", postID, userID)
		if err != nil {
			c.JSON(500, gin.H{"error": "Failed to remove like"})
			return
		}
		
		// Update likes count
		db.Exec("UPDATE posts SET likes_count = likes_count - 1 WHERE id = $1", postID)
		c.JSON(200, gin.H{"liked": false})
	}
	
	// Clear cache
	redisClient.Del(context.Background(), "posts:all")
}

func getImage(c *gin.Context) {
	imageID := c.Param("id")
	
	var imageDoc ImageData
	err := imagesCollection.FindOne(context.Background(), bson.M{"_id": imageID}).Decode(&imageDoc)
	if err != nil {
		c.JSON(404, gin.H{"error": "Image not found"})
		return
	}
	
	c.Header("Content-Type", imageDoc.MimeType)
	c.Header("Content-Length", strconv.FormatInt(imageDoc.Size, 10))
	c.Data(200, imageDoc.MimeType, imageDoc.Data)
}
