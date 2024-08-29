
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
