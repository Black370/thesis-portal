package config

import (
	"fmt"
	"log"
	"thesis-backend/models" // Adjust this to match your actual models package import path

	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

var DB *gorm.DB

func ConnectDatabase() {
	// Your existing connection string (adjust credentials if needed)
	dsn := "root:root@tcp(127.0.0.1:3306)/thesis_portal?charset=utf8mb4&parseTime=True&loc=Local"
	database, err := gorm.Open(mysql.Open(dsn), &gorm.Config{})

	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	DB = database
	fmt.Println("✅ Database connection established safely.")

	// FORCE IMMUTABLE MIGRATION IMMEDIATELY UPON CONNECTING:
	err = DB.AutoMigrate(&models.User{}, &models.Class{}, &models.Topic{}, &models.Registration{})
	// FORCE INDIVIDUAL MIGRATIONS WITH EXPLICIT ERRORS
	fmt.Println("⏳ Starting database table initialization...")

	if err := DB.AutoMigrate(&models.User{}); err != nil {
		log.Println("❌ User migration failed:", err)
	}

	if err := DB.AutoMigrate(&models.Class{}); err != nil {
		log.Println("❌ Class migration failed:", err)
	} else {
		fmt.Println("🔹 Classes table checked/created.")
	}

	if err := DB.AutoMigrate(&models.Topic{}); err != nil {
		log.Println("❌ Topic migration failed:", err)
	} else {
		fmt.Println("🔹 Topics table checked/created.")
	}

	if err := DB.AutoMigrate(&models.Registration{}); err != nil {
		log.Println("❌ Registration migration failed:", err)
	} else {
		fmt.Println("🔹 Registrations table checked/created.")
	}

	fmt.Println("🚀 Core structural sync complete.")
}
