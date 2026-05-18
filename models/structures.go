package models

type User struct {
	ID       string `gorm:"primaryKey;size:191;column:id" json:"id"`
	Username string `gorm:"unique;not null;size:191;column:username" json:"username"`
	Password string `gorm:"column:password" json:"password"`
	Role     string `gorm:"column:role" json:"role"`
	Name     string `gorm:"column:name" json:"name"`
}

type Class struct {
	ID        string `gorm:"primaryKey;size:191;column:id" json:"id"`
	Title     string `gorm:"column:title" json:"title"`
	Professor string `gorm:"column:professor" json:"professor"`
}

type Topic struct {
	ID         string `gorm:"primaryKey;size:191;column:id" json:"id"`
	ClassID    string `gorm:"size:191;column:class_id" json:"classId"`
	Title      string `gorm:"column:title" json:"title"`
	IsArchived bool   `gorm:"column:is_archived;default:false" json:"isArchived"`
}

type Registration struct {
	ID      uint   `gorm:"primaryKey;autoIncrement;column:id" json:"id"`
	Student string `gorm:"size:191;column:student" json:"student"`
	ClassID string `gorm:"size:191;column:class_id" json:"classId"`
	TopicID string `gorm:"size:191;column:topic_id" json:"topicId"`
	Status  string `gorm:"column:status" json:"status"`
	Reason  string `gorm:"column:reason" json:"reason"`
}

func (Class) TableName() string        { return "classes" }
func (Topic) TableName() string        { return "topics" }
func (Registration) TableName() string { return "registrations" }
