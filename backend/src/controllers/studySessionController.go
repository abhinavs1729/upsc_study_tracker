package controllers

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// GetStudySessions handles the request to get all study sessions
func GetStudySessions(c *gin.Context) {
	// Logic to fetch study sessions from the database
	// For now, return a mock response
	c.JSON(http.StatusOK, gin.H{"sessions": []string{"Session1", "Session2"}})
} 