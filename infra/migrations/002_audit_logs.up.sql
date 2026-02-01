CREATE TABLE audit_logs (
    audit_log_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_user_id UUID NOT NULL REFERENCES users(user_id),
    action VARCHAR(100) NOT NULL,
    target_user_id UUID REFERENCES users(user_id),
    payload JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_user_id);
CREATE INDEX idx_audit_logs_target ON audit_logs(target_user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
