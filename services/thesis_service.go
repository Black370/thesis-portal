package services

import (
	"errors"
	"thesis-backend/models"

	"gorm.io/gorm"
)

type ThesisService struct {
	DB *gorm.DB
}

func NewThesisService(db *gorm.DB) *ThesisService {
	return &ThesisService{DB: db}
}

// 1. Student requests to enroll in a Graduation Class
func (s *ThesisService) RequestClassEnrollment(studentUsername string, classID string) error {
	var class models.Class
	if err := s.DB.Where("id = ?", classID).First(&class).Error; err != nil {
		return errors.New("CLASS_NOT_FOUND")
	}

	var existingReg models.Registration
	err := s.DB.Where("student = ? AND class_id = ? AND topic_id = ?", studentUsername, classID, "").First(&existingReg).Error
	if err == nil {
		return errors.New("ALREADY_REQUESTED_CLASS")
	}

	newClassReg := models.Registration{
		Student: studentUsername,
		ClassID: classID,
		TopicID: "",
		Status:  "Pending",
	}
	return s.DB.Create(&newClassReg).Error
}

// 2. NEW: Professor approves or rejects a student's class entry request
func (s *ThesisService) ReviewClassRequest(registrationID uint, newStatus string) error {
	if newStatus != "Approved" && newStatus != "Rejected" {
		return errors.New("INVALID_STATUS")
	}

	// Find the registration record by its auto-incrementing ID
	var reg models.Registration
	if err := s.DB.First(&reg, registrationID).Error; err != nil {
		return errors.New("REQUEST_NOT_FOUND")
	}

	// Update the status column in MySQL
	return s.DB.Model(&reg).Update("status", newStatus).Error
}

// 3. Student picks a thesis topic (Enforces Approved Class Check!)
func (s *ThesisService) ApplyForThesis(studentUsername string, topicID string) error {
	var topic models.Topic
	if err := s.DB.Where("id = ?", topicID).First(&topic).Error; err != nil {
		return errors.New("TOPIC_NOT_FOUND")
	}
	if topic.IsArchived {
		return errors.New("TOPIC_ARCHIVED")
	}

	var classEnrollment models.Registration
	err := s.DB.Where("student = ? AND class_id = ? AND topic_id = ? AND status = ?",
		studentUsername, topic.ClassID, "", "Approved").First(&classEnrollment).Error
	if err != nil {
		return errors.New("NOT_ENROLLED_IN_CLASS")
	}

	var existingThesis models.Registration
	err = s.DB.Where("student = ? AND topic_id != ? AND status != ?", studentUsername, "", "Rejected").First(&existingThesis).Error
	if err == nil {
		return errors.New("ALREADY_HAVE_THESIS")
	}

	newThesisReg := models.Registration{
		Student: studentUsername,
		ClassID: topic.ClassID,
		TopicID: topicID,
		Status:  "Pending",
	}
	return s.DB.Create(&newThesisReg).Error
}
