package services

import (
	"errors"
	"strings"
	"thesis-backend/models"

	"gorm.io/gorm"
)

type TopicService struct {
	DB *gorm.DB
}

func NewTopicService(db *gorm.DB) *TopicService {
	return &TopicService{DB: db}
}

func (s *TopicService) ValidateAndCreateTopic(topic models.Topic) error {
	if strings.TrimSpace(topic.ID) == "" || strings.TrimSpace(topic.Title) == "" {
		return errors.New("topic ID or Title cannot be blank")
	}

	// Rule: Verify the class this topic belongs to exists
	var existingClass models.Class
	if err := s.DB.Where("id = ?", topic.ClassID).First(&existingClass).Error; err != nil {
		return errors.New("the specified Class ID does not exist")
	}

	// Rule: Check for duplicate Topic ID
	var existingTopic models.Topic
	if err := s.DB.Where("id = ?", topic.ID).First(&existingTopic).Error; err == nil {
		return errors.New("topic ID is already in use")
	}

	return s.DB.Create(&topic).Error
}
