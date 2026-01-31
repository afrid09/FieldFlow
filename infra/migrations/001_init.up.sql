-- FieldFlow Database Initialization Script
-- Schema only (no seed data)

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255),
    role VARCHAR(50) NOT NULL DEFAULT 'farmer',
    organization VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE fields (
    field_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    field_name VARCHAR(255) NOT NULL,
    description TEXT,
    location GEOGRAPHY(POINT, 4326) NOT NULL,
    boundary GEOGRAPHY(POLYGON, 4326),
    area_hectares DECIMAL(10, 2) NOT NULL,
    crop_type VARCHAR(100),
    planting_date DATE,
    expected_harvest_date DATE,
    irrigation_type VARCHAR(50),
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE soil_data (
    soil_data_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    field_id UUID NOT NULL REFERENCES fields(field_id) ON DELETE CASCADE,
    ph_level DECIMAL(3, 2),
    nitrogen_ppm DECIMAL(8, 2),
    phosphorus_ppm DECIMAL(8, 2),
    potassium_ppm DECIMAL(8, 2),
    organic_matter_percent DECIMAL(5, 2),
    moisture_percent DECIMAL(5, 2),
    temperature_celsius DECIMAL(5, 2),
    sample_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    sample_location GEOGRAPHY(POINT, 4326),
    lab_tested BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE weather_data (
    weather_data_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    field_id UUID NOT NULL REFERENCES fields(field_id) ON DELETE CASCADE,
    temperature_celsius DECIMAL(5, 2),
    humidity_percent DECIMAL(5, 2),
    pressure_hpa DECIMAL(7, 2),
    rainfall_mm DECIMAL(8, 2),
    wind_speed_kmh DECIMAL(6, 2),
    wind_direction_degrees INTEGER,
    solar_radiation_wm2 DECIMAL(8, 2),
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    data_source VARCHAR(100) DEFAULT 'api',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE ai_analysis (
    analysis_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    field_id UUID NOT NULL REFERENCES fields(field_id) ON DELETE CASCADE,
    analysis_type VARCHAR(100) NOT NULL,
    summary TEXT NOT NULL,
    recommendations JSONB DEFAULT '[]'::jsonb,
    confidence_score DECIMAL(5, 4),
    risk_level VARCHAR(50),
    risk_factors JSONB DEFAULT '[]'::jsonb,
    yield_prediction DECIMAL(10, 2),
    quality_score DECIMAL(5, 2),
    model_version VARCHAR(50),
    analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE events (
    event_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    aggregate_id UUID NOT NULL,
    aggregate_type VARCHAR(100) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    event_version INTEGER DEFAULT 1,
    payload JSONB NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    user_id UUID REFERENCES users(user_id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    sequence_number BIGSERIAL
);

CREATE TABLE notifications (
    notification_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    field_id UUID REFERENCES fields(field_id) ON DELETE CASCADE,
    notification_type VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    severity VARCHAR(50) DEFAULT 'info',
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    action_url VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE field_activities (
    activity_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    field_id UUID NOT NULL REFERENCES fields(field_id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(user_id),
    activity_type VARCHAR(100) NOT NULL,
    description TEXT,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    duration_hours DECIMAL(6, 2),
    cost DECIMAL(10, 2),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_active ON users(is_active);

CREATE INDEX idx_fields_user_id ON fields(user_id);
CREATE INDEX idx_fields_crop_type ON fields(crop_type);
CREATE INDEX idx_fields_status ON fields(status);
CREATE INDEX idx_fields_location ON fields USING GIST(location);
CREATE INDEX idx_fields_boundary ON fields USING GIST(boundary);
CREATE INDEX idx_fields_created_at ON fields(created_at DESC);

CREATE INDEX idx_soil_data_field_id ON soil_data(field_id);
CREATE INDEX idx_soil_data_sample_date ON soil_data(sample_date DESC);

CREATE INDEX idx_weather_data_field_id ON weather_data(field_id);
CREATE INDEX idx_weather_data_recorded_at ON weather_data(recorded_at DESC);

CREATE INDEX idx_ai_analysis_field_id ON ai_analysis(field_id);
CREATE INDEX idx_ai_analysis_type ON ai_analysis(analysis_type);
CREATE INDEX idx_ai_analysis_analyzed_at ON ai_analysis(analyzed_at DESC);

CREATE INDEX idx_events_aggregate_id ON events(aggregate_id);
CREATE INDEX idx_events_aggregate_type ON events(aggregate_type);
CREATE INDEX idx_events_event_type ON events(event_type);
CREATE INDEX idx_events_created_at ON events(created_at DESC);
CREATE INDEX idx_events_sequence ON events(sequence_number DESC);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_field_id ON notifications(field_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

CREATE INDEX idx_field_activities_field_id ON field_activities(field_id);
CREATE INDEX idx_field_activities_user_id ON field_activities(user_id);
CREATE INDEX idx_field_activities_type ON field_activities(activity_type);
CREATE INDEX idx_field_activities_start_time ON field_activities(start_time DESC);

CREATE OR REPLACE VIEW field_summary AS
SELECT 
    f.field_id,
    f.user_id,
    f.field_name,
    f.crop_type,
    f.area_hectares,
    f.status,
    ST_Y(f.location::geometry) as latitude,
    ST_X(f.location::geometry) as longitude,
    (SELECT ph_level FROM soil_data WHERE field_id = f.field_id ORDER BY sample_date DESC LIMIT 1) as latest_ph,
    (SELECT nitrogen_ppm FROM soil_data WHERE field_id = f.field_id ORDER BY sample_date DESC LIMIT 1) as latest_nitrogen,
    (SELECT temperature_celsius FROM weather_data WHERE field_id = f.field_id ORDER BY recorded_at DESC LIMIT 1) as latest_temperature,
    (SELECT humidity_percent FROM weather_data WHERE field_id = f.field_id ORDER BY recorded_at DESC LIMIT 1) as latest_humidity,
    (SELECT summary FROM ai_analysis WHERE field_id = f.field_id ORDER BY analyzed_at DESC LIMIT 1) as latest_analysis,
    (SELECT yield_prediction FROM ai_analysis WHERE field_id = f.field_id ORDER BY analyzed_at DESC LIMIT 1) as predicted_yield,
    f.created_at,
    f.updated_at
FROM fields f;

CREATE OR REPLACE VIEW user_dashboard AS
SELECT 
    u.user_id,
    u.full_name,
    u.email,
    COUNT(DISTINCT f.field_id) as total_fields,
    SUM(f.area_hectares) as total_area,
    COUNT(DISTINCT CASE WHEN f.status = 'active' THEN f.field_id END) as active_fields,
    COUNT(DISTINCT n.notification_id) FILTER (WHERE n.is_read = false) as unread_notifications,
    MAX(f.updated_at) as last_field_update
FROM users u
LEFT JOIN fields f ON u.user_id = f.user_id
LEFT JOIN notifications n ON u.user_id = n.user_id
GROUP BY u.user_id, u.full_name, u.email;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION calculate_field_area()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.boundary IS NOT NULL THEN
        NEW.area_hectares = ST_Area(NEW.boundary::geography) / 10000;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION create_notification(
    p_user_id UUID,
    p_field_id UUID,
    p_type VARCHAR,
    p_title VARCHAR,
    p_message TEXT,
    p_severity VARCHAR DEFAULT 'info'
)
RETURNS UUID AS $$
DECLARE
    v_notification_id UUID;
BEGIN
    INSERT INTO notifications (user_id, field_id, notification_type, title, message, severity)
    VALUES (p_user_id, p_field_id, p_type, p_title, p_message, p_severity)
    RETURNING notification_id INTO v_notification_id;
    
    RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_fields_updated_at
    BEFORE UPDATE ON fields
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER calculate_field_area_trigger
    BEFORE INSERT OR UPDATE ON fields
    FOR EACH ROW
    WHEN (NEW.boundary IS NOT NULL)
    EXECUTE FUNCTION calculate_field_area();

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;
