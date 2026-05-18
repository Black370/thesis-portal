package repositories

import (
	"thesis-backend/models"

	"gorm.io/gorm"
)

type UserRepository struct {
	DB *gorm.DB
}

func NewUserRepository(db *gorm.DB) *UserRepository {
	return &UserRepository{DB: db}
}

// FindByUsername queries MySQL for a single user
func (r *UserRepository) FindByUsername(username string) (models.User, error) {
	var user models.User
	err := r.DB.Where("username = ?", username).First(&user).Error
	return user, err
}

// CreateUser inserts a user row into MySQL
func (r *UserRepository) CreateUser(user models.User) error {
	return r.DB.Create(&user).Error
}
