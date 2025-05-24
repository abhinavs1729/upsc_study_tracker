package main

import (
	"log"
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Fatal("Error loading .env file")
	}

	// Initialize Gin router
	r := gin.Default()

	// Middleware
	r.Use(gin.Logger())
	r.Use(gin.Recovery())

	// Routes
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	// API routes
	api := r.Group("/api")
	{
		api.GET("/users", userController.GetUsers)
		api.GET("/study-sessions", studySessionController.GetStudySessions)
		api.GET("/syllabus", syllabusController.GetSyllabus)
		api.GET("/calendar", calendarController.GetCalendar)
		api.GET("/analytics", analyticsController.GetAnalytics)
	}

	// Start server
	port := os.Getenv("PORT")
	if port == "" {
		port = "5000"
	}
	if err := r.Run(":" + port); err != nil {
		log.Fatal("Failed to start server:", err)
	}
} 