# Discord Study Bot

This bot is designed to assist study communities with various features, including camera tracking, user statistics, Pomodoro functionality, and reaction management. It helps keep track of user activity, manage study sessions, and engage with users using reactions.

## Features

1. **Camera Setup Tracker:**
   - Tracks users in camera-on study channels.
   - Disconnects users with their cameras off in channels designated for camera-on study sessions.

2. **User Statistics:**
   - Tracks user study hours (daily, weekly, monthly, and all-time).
   - Displays stats using rich embeds.

3. **Pomodoro Timer:**
   - Users can set session times, break times, and the number of sessions.
   - Provides Pomodoro session information.
   - Allows users to stop and edit the Pomodoro session at any time.

4. **Reaction Manager:**
   - Add reactions to a specific message or by providing a message ID.
   - Manages roles based on reactions under a message.

## Prerequisites

1. Node.js and npm installed.
2. PostgreSQL database.
3. Discord developer account to create a bot and get the token.
4. `.env` file with your bot token and client ID.

```
BOT_TOKEN=<Your_Bot_Token>
CLIENT_ID=<Your_Client_ID>
```

## Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/your-repo/discord-study-bot.git
   cd discord-study-bot
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a PostgreSQL database and execute the SQL commands found in the `db.sql` file to set up the necessary tables.

4. Run the bot:
   ```bash
   npm start
   ```

## File Structure

- **main.js**: Entry point of the bot. Handles events, interactions, and connects to the database.
- **utils/Camera.js**: Manages the camera setup tracker in study channels.
- **utils/TimeActivity.js**: Handles user statistics tracking (time spent in voice channels) and interaction with the database.
- **utils/Pomodoro.js**: Provides Pomodoro timer functionality.
- **utils/Reactions.js**: Manages message reactions and assigns roles based on reactions.
- **database/db.js**: Database connection management using PostgreSQL.
- **config/scheduleStats.js**: Scheduled jobs for updating user statistics (daily, weekly, monthly resets).

## Database Setup

The database is used to store various bot-related information:

- **camera_channels**: Stores information about the server and the channel designated for camera-on study sessions.
- **message_channels**: Stores the text channels where the bot will send messages.
- **server**: Stores server information and tracking settings.
- **timeActivity**: Stores user time tracking data (daily, weekly, monthly, and all-time hours).
- **pomodoro_sessions**: Stores information related to each user's Pomodoro sessions.
- **reactions_table**: Stores information for managing role reactions to messages.

Run the following SQL queries in your PostgreSQL database:

```sql
-- Camera Channel Table
CREATE TABLE camera_channels (
    server_id VARCHAR(255) NOT NULL,
    channel_id VARCHAR(255) NOT NULL,
    PRIMARY KEY (server_id, channel_id)
);

-- Message Channel Table
CREATE TABLE message_channels (
    server_id VARCHAR(255) PRIMARY KEY,
    channel_id VARCHAR(255) NOT NULL
);

-- Server Table
CREATE TABLE server (
    server_id VARCHAR(255) PRIMARY KEY, 
    enable_tracking BOOLEAN NOT NULL 
);

-- Time Activity Table
CREATE TABLE timeActivity(
    server_id VARCHAR(255),
    user_id VARCHAR(255),
    daily_activity FLOAT DEFAULT 0.0,  
    weekly_hours FLOAT DEFAULT 0.0,    
    monthly_hours FLOAT DEFAULT 0.0,   
    all_time_hours FLOAT DEFAULT 0.0,  
    PRIMARY KEY (server_id, user_id)  
);

-- Update Time Activity Table
ALTER TABLE timeActivity
ADD COLUMN join_time TIMESTAMP,
ADD COLUMN leave_time TIMESTAMP,
ADD COLUMN total_time FLOAT DEFAULT 0.0;

-- Pomodoro Sessions Table
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

-- Reactions Table
CREATE TABLE reactions_table (
  id SERIAL PRIMARY KEY,
  server_id BIGINT NOT NULL,
  channel_id BIGINT NOT NULL,
  message_id BIGINT NOT NULL,
  emoji VARCHAR(255) NOT NULL,
  role_id BIGINT NOT NULL,
  UNIQUE (server_id, channel_id, message_id, emoji) -- Ensures each emoji is unique for a message
);
```

## Usage

### Camera Commands:
- The bot will track users in the designated camera-on channels. If someone joins and turns off their camera, they will be disconnected from the voice channel.

### Stats Commands:
- Tracks user study hours (daily, weekly, monthly, and all-time).
- Use slash commands to view statistics, which will be returned as rich embeds.

### Pomodoro Commands:
- Start a Pomodoro session by setting session time, break time, and number of sessions.
- View current Pomodoro session status.
- Edit or stop an ongoing Pomodoro session.

### Reaction Commands:
- Add a reaction to a message by using a message ID or the actual message.
- The bot will react with a specific emoji, and users who click on the reaction will be assigned a role.

## Contributing

Feel free to open issues or pull requests for any bugs or improvements.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---

This `README.md` provides an overview of the Discord Study Bot, including its features, setup instructions, database schema, and basic usage.
