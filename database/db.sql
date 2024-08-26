CREATE TABLE camera_channels (
    server_id VARCHAR(255) NOT NULL,
    channel_id VARCHAR(255) NOT NULL,
    PRIMARY KEY (server_id, channel_id)
);

CREATE TABLE message_channels (
    server_id VARCHAR(255) PRIMARY KEY,
    channel_id VARCHAR(255) NOT NULL
);
