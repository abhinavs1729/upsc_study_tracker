package controllers

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// GetUsers handles the request to get all users
func GetUsers(c *gin.Context) {
	// Logic to fetch users from the database
	// For now, return a mock response
	c.JSON(http.StatusOK, gin.H{"users": []string{"User1", "User2"}})
} 