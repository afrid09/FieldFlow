-- Purpose: Database migration.
DROP VIEW IF EXISTS user_dashboard;
DROP VIEW IF EXISTS field_summary;

DROP TRIGGER IF EXISTS calculate_field_area_trigger ON fields;
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
DROP TRIGGER IF EXISTS update_fields_updated_at ON fields;

DROP FUNCTION IF EXISTS create_notification;
DROP FUNCTION IF EXISTS calculate_field_area;
DROP FUNCTION IF EXISTS update_updated_at_column;

DROP TABLE IF EXISTS field_activities;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS events;
DROP TABLE IF EXISTS ai_analysis;
DROP TABLE IF EXISTS weather_data;
DROP TABLE IF EXISTS soil_data;
DROP TABLE IF EXISTS fields;
DROP TABLE IF EXISTS users;
