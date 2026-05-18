package handlers

import (
	"net/http"
	"thesis-backend/services"
	"thesis-backend/models"

	"github.com/gin-gonic/gin"
)

type ClassHandler struct {
	Service *services.ClassService
}

func NewClassHandler(s *services.ClassService) *ClassHandler {
	return &ClassHandler{Service: s}
}

func (h *ClassHandler) CreateClassHandler(c *gin.Context) {
	var input models.Class
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "Malformed request payload"})
		return
	}

	// Run the request through the service brain
	err := h.Service.ValidateAndCreateClass(input)
	if err != nil {
		// Cleanly catch errors sent by our service and translate them for the UI
		switch err.Error() {
		case "INVALID_CLASS_TITLE":
			c.JSON(http.StatusUnprocessableEntity, gin.H{"error": "Invalid Class: Title cannot be blank"})
		case "INVALID_PROFESSOR":
			c.JSON(http.StatusNotFound, gin.H{"error": "Invalid Class: Assigned faculty member not found"})
		case "DUPLICATE_CLASS":
			c.JSON(http.StatusConflict, gin.H{"error": "Invalid Class: Identical ID already registered"})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Database persistence failure"})
		}
		return
	}

	c.JSON(http.StatusCreated, gin.H{"status": "success", "message": "Class established successfully"})
}
