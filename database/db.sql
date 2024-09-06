
-- STORE THE CAMERA CHANNEL INFO
CREATE TABLE camera_channels (
    
    server_id VARCHAR(255) NOT NULL,
    channel_id VARCHAR(255) NOT NULL,
    PRIMARY KEY (server_id, channel_id)
);

-- STORE TEXT CHANNEL WHERE THE MESSAGES NEEDS TO BE SENT 
CREATE TABLE message_channels (
    server_id VARCHAR(255) PRIMARY KEY,
    channel_id VARCHAR(255) NOT NULL
);

-- STORE SERVER INFO 

CREATE TABLE server (
 server_id VARCHAR(255) PRIMARY KEY , 
  enable_tracking BOOLEAN NOT NULL 
) ;


-- STORE THE TIME ACTIVITY OF USERS OF A PARTICULAR SERVER
CREATE TABLE timeActivity(
    server_id VARCHAR(255),
    user_id VARCHAR(255),
    daily_activity FLOAT DEFAULT 0.0,  
    weekly_hours FLOAT DEFAULT 0.0,    
    monthly_hours FLOAT DEFAULT 0.0,   
    all_time_hours FLOAT DEFAULT 0.0,  
    PRIMARY KEY (server_id, user_id)  
);

-- UPDATE THE TABLE OF TIME ACTIVITY 
-- Add columns for tracking voice activity
ALTER TABLE timeActivity
ADD COLUMN join_time TIMESTAMP,
ADD COLUMN leave_time TIMESTAMP,
ADD COLUMN total_time FLOAT DEFAULT 0.0;


-- POMODORO TABLE 
CREATE TABLE pomodoro_sessions (
    id SERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    server_id BIGINT NOT NULL,
    session_time INTEGER NOT NULL,   -- in minutes
    break_time INTEGER NOT NULL,     -- in minutes
    total_sessions INTEGER NOT NULL,
    completed_sessions INTEGER DEFAULT 0,
    current_state VARCHAR(20) DEFAULT 'idle', -- 'idle', 'session', 'break'
    start_time TIMESTAMPTZ, -- Tracks the start time of the current session or break
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, server_id) -- Ensure one session per user per server
);
ALTER TABLE pomodoro_sessions ADD COLUMN current_session INTEGER DEFAULT 0;
ALTER TABLE pomodoro_sessions ADD COLUMN time_remaining TIMESTAMPTZ;


-- MESSAGES REACTIONS TABLE
 
CREATE TABLE reactions_table ( 
    id SERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL, 
    server_id BIGINT NOT NULL,
    channel_id BIGINT NOT NULL,
    messages VARCHAR(500) NOT NULL    
)