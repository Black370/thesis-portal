package main

import (
	"fmt"
	"net/http"
	"thesis-backend/config"
	"thesis-backend/models"
	"thesis-backend/repositories"
	"thesis-backend/services"

	"github.com/gin-gonic/gin"
)

func main() {
	config.ConnectDatabase()
	userRepo := repositories.NewUserRepository(config.DB)

	// Instantiate services
	classService := services.NewClassService(config.DB)
	topicService := services.NewTopicService(config.DB)
	thesisService := services.NewThesisService(config.DB)

	r := gin.Default()

	// CORS Middleware Pass
	r.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	})

	// --- GLOBAL DATA RETRIEVAL ---
	r.GET("/api/data", func(c *gin.Context) {
		users := []models.User{}
		classes := []models.Class{}
		topics := []models.Topic{}
		allRegistrations := []models.Registration{}

		config.DB.Find(&users)
		config.DB.Find(&classes)
		config.DB.Find(&topics)
		config.DB.Find(&allRegistrations)

		classAccess := []models.Registration{}
		thesisRegistrations := []models.Registration{}

		for _, reg := range allRegistrations {
			if reg.TopicID == "" {
				classAccess = append(classAccess, reg)
			} else {
				thesisRegistrations = append(thesisRegistrations, reg)
			}
		}

		c.JSON(http.StatusOK, gin.H{
			"users":         users,
			"classes":       classes,
			"topics":        topics,
			"classAccess":   classAccess,
			"registrations": thesisRegistrations,
		})
	})

	// --- AUTH HANDLER ---
	r.POST("/api/login", func(c *gin.Context) {
		var loginData struct {
			Username string `json:"username"`
			Password string `json:"password"`
		}
		if err := c.ShouldBindJSON(&loginData); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
			return
		}

		user, err := userRepo.FindByUsername(loginData.Username)
		if err != nil || user.Password != loginData.Password {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Wrong username or password"})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"user":  user,
			"token": "fake-jwt-token-for-now",
		})
	})

	// --- CLASS ENDPOINTS ---
	r.POST("/api/classes", func(c *gin.Context) {
		var input struct {
			ID        string `json:"id"`
			Title     string `json:"title"`
			Professor string `json:"professor"`
		}
		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Malformed request payload"})
			return
		}

		profUser := input.Professor
		if profUser == "" {
			profUser = "prof_tony"
		}

		classModel := models.Class{
			ID:        input.ID,
			Title:     input.Title,
			Professor: profUser,
		}

		if err := classService.ValidateAndCreateClass(classModel); err != nil {
			c.JSON(http.StatusUnprocessableEntity, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusCreated, gin.H{"message": "Class established successfully"})
	})

	r.PUT("/api/classes/:id", func(c *gin.Context) {
		classID := c.Param("id")
		var input struct {
			Title string `json:"title"`
		}
		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid payload"})
			return
		}

		if err := config.DB.Model(&models.Class{}).Where("id = ?", classID).Update("title", input.Title).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update class"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"message": "Class updated successfully"})
	})

	r.DELETE("/api/classes/:id", func(c *gin.Context) {
		classID := c.Param("id")
		config.DB.Where("id = ?", classID).Delete(&models.Class{})
		config.DB.Where("class_id = ?", classID).Delete(&models.Topic{})
		c.JSON(http.StatusOK, gin.H{"message": "Class and dependencies removed"})
	})

	// --- TOPIC ENDPOINTS ---
	r.POST("/api/topics", func(c *gin.Context) {
		var input struct {
			ID      string `json:"id"`
			ClassID string `json:"classId"`
			Title   string `json:"title"`
		}
		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Malformed request payload"})
			return
		}

		topicModel := models.Topic{
			ID:         input.ID,
			ClassID:    input.ClassID,
			Title:      input.Title,
			IsArchived: false,
		}

		if err := topicService.ValidateAndCreateTopic(topicModel); err != nil {
			c.JSON(http.StatusUnprocessableEntity, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusCreated, gin.H{"message": "Topic published successfully"})
	})

	r.PUT("/api/topics/:id", func(c *gin.Context) {
		topicID := c.Param("id")
		var input struct {
			Title   string `json:"title"`
			ClassID string `json:"classId"`
		}
		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid data"})
			return
		}

		err := config.DB.Model(&models.Topic{}).Where("id = ?", topicID).Updates(map[string]interface{}{"title": input.Title, "class_id": input.ClassID}).Error
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update topic"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"message": "Topic updated"})
	})

	r.DELETE("/api/topics/:id", func(c *gin.Context) {
		topicID := c.Param("id")
		config.DB.Model(&models.Topic{}).Where("id = ?", topicID).Update("is_archived", true)
		c.JSON(http.StatusOK, gin.H{"message": "Topic archived"})
	})

	// --- CLASS ENROLLMENT / ACCESS REQUESTS ENDPOINT ---
	r.POST("/api/access", func(c *gin.Context) {
		var input struct {
			Student string `json:"student"`
			ClassID string `json:"classId"`
			Status  string `json:"status"`
		}
		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid format"})
			return
		}

		if input.Status == "Approved" || input.Status == "Denied" {
			err := config.DB.Model(&models.Registration{}).
				Where("student = ? AND class_id = ? AND topic_id = ?", input.Student, input.ClassID, "").
				Update("status", input.Status).Error
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Database update error"})
				return
			}
			c.JSON(http.StatusOK, gin.H{"message": "Access level modified"})
			return
		}

		var existing models.Registration
		err := config.DB.Where("student = ? AND class_id = ? AND topic_id = ?", input.Student, input.ClassID, "").First(&existing).Error
		if err == nil {
			config.DB.Model(&existing).Update("status", "Pending")
			c.JSON(http.StatusOK, gin.H{"message": "Access reset to Pending"})
			return
		}

		newAccess := models.Registration{
			Student: input.Student,
			ClassID: input.ClassID,
			TopicID: "",
			Status:  "Pending",
		}

		if err := config.DB.Create(&newAccess).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save registration entry"})
			return
		}
		c.JSON(http.StatusCreated, gin.H{"message": "Access application submitted successfully"})
	})

	// --- THESIS TOPIC REGISTRATION ENDPOINTS ---
	r.POST("/api/registrations", func(c *gin.Context) {
		var input struct {
			Student string `json:"student"`
			TopicID string `json:"topicId"`
			Status  string `json:"status"`
			Reason  string `json:"reason"`
		}
		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid submission blueprint"})
			return
		}

		if input.Status == "Approved" || input.Status == "Denied" || input.Status == "Pending" {
			var match models.Registration
			err := config.DB.Where("student = ? AND topic_id = ?", input.Student, input.TopicID).First(&match).Error
			if err == nil {
				config.DB.Model(&match).Updates(map[string]interface{}{"status": input.Status, "reason": input.Reason})
				c.JSON(http.StatusOK, gin.H{"message": "Registration updated successfully"})
				return
			}
		}

		err := thesisService.ApplyForThesis(input.Student, input.TopicID)
		if err != nil {
			c.JSON(http.StatusUnprocessableEntity, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusCreated, gin.H{"message": "Thesis request saved successfully"})
	})

	// FIXED: Fully implemented DELETE router logic to let students clear/retract thesis selections
	r.DELETE("/api/registrations/:student", func(c *gin.Context) {
		studentUsername := c.Param("student")

		// Delete any registration rows where topic_id is NOT blank (which specifically isolates thesis choices)
		err := config.DB.Where("student = ? AND topic_id != ?", studentUsername, "").Delete(&models.Registration{}).Error
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to reset thesis selections inside database"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"message": "Thesis selection retracted successfully!"})
	})

	// --- 🛡️ FIXED ADMIN USER MANAGEMENT HANDLERS (Connected Directly to MySQL Table via GORM) ---
	r.POST("/api/users", func(c *gin.Context) {
		var u models.User
		if err := c.ShouldBindJSON(&u); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid layout formatting"})
			return
		}

		// Enforce a robust dynamic unique ID fallback string if frontend leaves it blank
		if u.ID == "" {
			u.ID = "USR-" + fmt.Sprintf("%d", len(u.Username)*7)
		}

		if err := config.DB.Create(&u).Error; err != nil {
			c.JSON(http.StatusConflict, gin.H{"error": "An account with this username already exists inside database"})
			return
		}
		c.JSON(http.StatusCreated, u)
	})

	r.PUT("/api/users/:username", func(c *gin.Context) {
		usernameParam := c.Param("username")
		var input struct {
			Password string `json:"password"`
			Role     string `json:"role"`
			Name     string `json:"name"`
			ID       string `json:"id"` // FIXED: Now tracking the ID value from the Admin form
		}
		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Malformed edit payload"})
			return
		}

		// FIXED: Included "id" inside the map allocation sequence to update it in MySQL!
		err := config.DB.Model(&models.User{}).Where("username = ?", usernameParam).
			Updates(map[string]interface{}{
				"password": input.Password,
				"role":     input.Role,
				"name":     input.Name,
				"id":       input.ID,
			}).Error
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to overwrite user permissions"})
			return
		}

		// Return refreshed confirmation payload back to the UI engine to refresh dashboard safely
		var updatedUser models.User
		config.DB.Where("username = ?", usernameParam).First(&updatedUser)
		c.JSON(http.StatusOK, updatedUser)
	})

	r.DELETE("/api/users/:username", func(c *gin.Context) {
		usernameParam := c.Param("username")
		if err := config.DB.Where("username = ?", usernameParam).Delete(&models.User{}).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Delete action rejected"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"message": "Account removed from registry"})
	})

	fmt.Println("🚀 Portal Core Engine Operational on port 8080")
	r.Run(":8080")
}
