package handlers

import (
	"net/http"
	"thesis-backend/models"
	"thesis-backend/services" // adjust this to your real module name

	"github.com/gin-gonic/gin"
)

type TopicHandler struct {
	Service *services.TopicService
}

func NewTopicHandler(s *services.TopicService) *TopicHandler {
	return &TopicHandler{Service: s}
}

func (h *TopicHandler) CreateTopicHandler(c *gin.Context) {
	// FIXED: Changed services.Topic to models.Topic
	var input models.Topic
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Malformed request payload"})
		return
	}

	// ... the rest of your handler code

	err := h.Service.ValidateAndCreateTopic(input)
	if err != nil {
		switch err.Error() {
		case "INVALID_TOPIC_DATA":
			c.JSON(http.StatusUnprocessableEntity, gin.H{"error": "Invalid Topic: Blank IDs or Titles are rejected"})
		case "INVALID_CLASS":
			c.JSON(http.StatusNotFound, gin.H{"error": "Invalid Class: The specified Class ID does not exist"})
		case "DUPLICATE_TOPIC":
			c.JSON(http.StatusConflict, gin.H{"error": "Invalid Topic: Topic ID is already in use"})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Database writing anomaly"})
		}
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Graduation thesis topic published successfully!"})
}
