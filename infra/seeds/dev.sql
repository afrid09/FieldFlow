-- Development seed data
INSERT INTO users (user_id, email, full_name, role, organization, password_hash) VALUES
('00000000-0000-0000-0000-000000000001', 'demo@fieldflow.com', 'Demo Farmer', 'farmer', 'FieldFlow Demo Farms', '$2a$10$srpvK1tWeAIgajEVOmh84OMIcP6l/guCHPFm56E0n70O5/7uxdZla');

INSERT INTO fields (field_id, user_id, field_name, description, location, area_hectares, crop_type, status) VALUES
('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000001', 'North Field', 'Primary corn production field', ST_GeographyFromText('POINT(-95.7129 37.0902)'), 45.5, 'corn', 'active'),
('00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000001', 'South Field', 'Wheat and soybean rotation', ST_GeographyFromText('POINT(-95.7150 37.0850)'), 32.3, 'wheat', 'active'),
('00000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-000000000001', 'East Field', 'Organic vegetable production', ST_GeographyFromText('POINT(-95.7050 37.0880)'), 12.8, 'vegetables', 'active');

INSERT INTO soil_data (field_id, ph_level, nitrogen_ppm, phosphorus_ppm, potassium_ppm, organic_matter_percent, moisture_percent) VALUES
('00000000-0000-0000-0000-000000000101', 6.5, 45.2, 23.1, 180.5, 3.2, 22.5),
('00000000-0000-0000-0000-000000000102', 6.8, 52.3, 28.4, 195.2, 3.8, 24.1),
('00000000-0000-0000-0000-000000000103', 7.1, 38.9, 31.2, 210.8, 4.5, 26.3);

INSERT INTO weather_data (field_id, temperature_celsius, humidity_percent, rainfall_mm, wind_speed_kmh) VALUES
('00000000-0000-0000-0000-000000000101', 24.5, 65.2, 2.3, 12.5),
('00000000-0000-0000-0000-000000000102', 24.8, 64.8, 2.1, 13.2),
('00000000-0000-0000-0000-000000000103', 24.2, 66.1, 2.5, 11.8);

INSERT INTO ai_analysis (field_id, analysis_type, summary, confidence_score, yield_prediction, risk_level) VALUES
('00000000-0000-0000-0000-000000000101', 'yield_prediction', 'Field conditions are optimal for corn production. Soil nutrients are well-balanced.', 0.87, 185.5, 'low'),
('00000000-0000-0000-0000-000000000102', 'yield_prediction', 'Wheat crop showing good development. Consider nitrogen supplementation.', 0.82, 142.3, 'medium'),
('00000000-0000-0000-0000-000000000103', 'yield_prediction', 'Organic vegetable production on track. Monitor moisture levels closely.', 0.79, 95.8, 'low');
-- Development seed data

-- Insert test user
INSERT INTO users (user_id, email, full_name, role, organization, password_hash) VALUES
('00000000-0000-0000-0000-000000000001', 'demo@fieldflow.com', 'Demo Farmer', 'farmer', 'FieldFlow Demo Farms', '$2a$10$srpvK1tWeAIgajEVOmh84OMIcP6l/guCHPFm56E0n70O5/7uxdZla');

-- Insert test fields
INSERT INTO fields (field_id, user_id, field_name, description, location, area_hectares, crop_type, status) VALUES
('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000001', 'North Field', 'Primary corn production field', ST_GeographyFromText('POINT(-95.7129 37.0902)'), 45.5, 'corn', 'active'),
('00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000001', 'South Field', 'Wheat and soybean rotation', ST_GeographyFromText('POINT(-95.7150 37.0850)'), 32.3, 'wheat', 'active'),
('00000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-000000000001', 'East Field', 'Organic vegetable production', ST_GeographyFromText('POINT(-95.7050 37.0880)'), 12.8, 'vegetables', 'active');

-- Insert test soil data
INSERT INTO soil_data (field_id, ph_level, nitrogen_ppm, phosphorus_ppm, potassium_ppm, organic_matter_percent, moisture_percent) VALUES
('00000000-0000-0000-0000-000000000101', 6.5, 45.2, 23.1, 180.5, 3.2, 22.5),
('00000000-0000-0000-0000-000000000102', 6.8, 52.3, 28.4, 195.2, 3.8, 24.1),
('00000000-0000-0000-0000-000000000103', 7.1, 38.9, 31.2, 210.8, 4.5, 26.3);

-- Insert test weather data
INSERT INTO weather_data (field_id, temperature_celsius, humidity_percent, rainfall_mm, wind_speed_kmh) VALUES
('00000000-0000-0000-0000-000000000101', 24.5, 65.2, 2.3, 12.5),
('00000000-0000-0000-0000-000000000102', 24.8, 64.8, 2.1, 13.2),
('00000000-0000-0000-0000-000000000103', 24.2, 66.1, 2.5, 11.8);

-- Insert test AI analysis
INSERT INTO ai_analysis (field_id, analysis_type, summary, confidence_score, yield_prediction, risk_level) VALUES
('00000000-0000-0000-0000-000000000101', 'yield_prediction', 'Field conditions are optimal for corn production. Soil nutrients are well-balanced.', 0.87, 185.5, 'low'),
('00000000-0000-0000-0000-000000000102', 'yield_prediction', 'Wheat crop showing good development. Consider nitrogen supplementation.', 0.82, 142.3, 'medium'),
('00000000-0000-0000-0000-000000000103', 'yield_prediction', 'Organic vegetable production on track. Monitor moisture levels closely.', 0.79, 95.8, 'low');
