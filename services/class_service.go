package services

import (
	"errors"
	"strings"
	"thesis-backend/models"

	"gorm.io/gorm"
)

type ClassService struct {
	DB *gorm.DB
}

func NewClassService(db *gorm.DB) *ClassService {
	return &ClassService{DB: db}
}

func (s *ClassService) ValidateAndCreateClass(class models.Class) error {
	// Rule 1: Enforce code format (e.g., Computer Science 2026 must have a title)
	if strings.TrimSpace(class.Title) == "" {
		return errors.New("INVALID_CLASS_TITLE: Class title cannot be empty")
	}

	// Rule 2: Verify the assigned professor actually exists in the DB and is a prof
	var prof models.User
	err := s.DB.Where("username = ? AND role = ?", class.Professor, "professor").First(&prof).Error
	if err != nil {
		return errors.New("INVALID_PROFESSOR: The assigned faculty member does not exist or lacks permissions")
	}

	// Rule 3: Check for duplicate class IDs
	var existingClass models.Class
	if err := s.DB.Where("id = ?", class.ID).First(&existingClass).Error; err == nil {
		return errors.New("DUPLICATE_CLASS: A class with this identifier already exists")
	}

	// Everything passes! Save it.
	return s.DB.Create(&class).Error
}
