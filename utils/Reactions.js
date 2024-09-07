import {
  SlashCommandBuilder,
  ChannelType,
  PermissionsBitField,
} from "discord.js";
import { pool } from "../database/db.js";
import { client } from "../index.js";
// Slash command for sending a message with reactions
export const reactionCommands = [
  new SlashCommandBuilder()
    .setName("react-send-message")
    .setDescription(
      "Sends a message in a channel with reactions and optionally equips or unequips a role."
    )
    .addStringOption((option) =>
      option
        .setName("message")
        .setDescription("Enter your message input here.")
        .setRequired(true)
    )
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription("Select the channel")
        .setRequired(true)
        .addChannelTypes(ChannelType.GuildText)
    )
    .addRoleOption((option) =>
      option
        .setName("role")
        .setDescription("Select the role to equip or unequip.")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("emoji")
        .setDescription("Enter the emoji to react with.")
        .setRequired(true)
    )
    .addBooleanOption((option) =>
      option
        .setName("equip")
        .setDescription(
          "Specify whether to equip (true) or unequip (false) the role."
        )
        .setRequired(true)
    ),
].map((command) => command.toJSON());

export async function handleReactions(interaction) {
  if (!interaction.isCommand()) return;

  const { commandName, options, guild, member } = interaction;
  const serverId = guild.id;

  // Check for required permissions
  if (!member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
    await interaction.reply(
      "You do not have the required permissions to use this command."
    );
    return;
  }

  if (commandName === "react-send-message") {
    const messageContent = options.getString("message");
    const targetChannel = options.getChannel("channel");
    const targetRole = options.getRole("role");
    const emoji = options.getString("emoji");
    const equip = options.getBoolean("equip");

    if (!targetChannel || targetChannel.type !== ChannelType.GuildText) {
      await interaction.reply("Please select a valid text channel.");
      return;
    }

    try {
      // Send the message and react with the emoji
      const sentMessage = await targetChannel.send(messageContent);
      await sentMessage.react(emoji);

      // Save emoji-role pair in the database
      await pool.query(
        `INSERT INTO reactions_table (server_id, channel_id, message_id, emoji, role_id) 
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (server_id, channel_id, message_id, emoji) 
           DO UPDATE SET role_id = EXCLUDED.role_id;`,
        [serverId, targetChannel.id, sentMessage.id, emoji, targetRole.id]
      );

      // Handle equipping or unequipping the role for the user
      const botMember = await guild.members.fetch(member.id);
      const botHighestRole = botMember.roles.highest;

      if (targetRole.position >= botHighestRole.position) {
        await interaction.reply(
          "I cannot manage roles that are higher or equal to my highest role."
        );
        return;
      }

      if (equip) {
        if (member.roles.cache.has(targetRole.id)) {
          await interaction.reply("You already have this role.");
        } else {
          await member.roles.add(targetRole);
          await interaction.reply(`Role ${targetRole.name} has been equipped.`);
        }
      } else {
        if (!member.roles.cache.has(targetRole.id)) {
          await interaction.reply("You do not have this role.");
        } else {
          await member.roles.remove(targetRole);
          await interaction.reply(
            `Role ${targetRole.name} has been unequipped.`
          );
        }
      }
    } catch (error) {
      console.error("Error sending message or handling role:", error);
      await interaction.reply(
        "There was an error sending the message or handling the role."
      );
    }
  }
}

// Event handler for adding or removing a reaction
export async function listenReaction(reaction, user, isAdding) {
    if (reaction.partial) {
        try {
            await reaction.fetch();
        } catch (error) {
            console.error('Failed to fetch reaction:', error);
            return;
        }
    }

    if (!user || user.bot) return; // Ignore bot reactions

    const emoji = reaction.emoji.name; // Get the emoji used for the reaction
    const message = reaction.message; // Get the message the reaction was added to
    const guild = message.guild; // Get the guild (server) where the reaction happened
    const member = await guild.members.fetch(user.id); // Fetch the member who reacted

    console.log(
        `User ${user.username} ${isAdding ? 'reacted with' : 'removed reaction'} ${emoji} to/from message ID: ${message.id}`
    );

    try {
        // Retrieve the role ID for the given emoji from the database
        const result = await pool.query(
            `SELECT role_id FROM reactions_table WHERE server_id = $1 AND message_id = $2 AND emoji = $3`,
            [guild.id, message.id, emoji]
        );

        if (result.rows.length > 0) {
            const roleID = result.rows[0].role_id;
            const role = guild.roles.cache.get(roleID); // Get the role from the server

            if (role) {
                if (isAdding) {
                    // Add the role if the user doesn't already have it
                    if (!member.roles.cache.has(roleID)) {
                        await member.roles.add(roleID);
                        console.log(`Role ${role.name} added to ${user.username}`);
                    }
                } else {
                    // Remove the role if the user has it
                    if (member.roles.cache.has(roleID)) {
                        await member.roles.remove(roleID);
                        console.log(`Role ${role.name} removed from ${user.username}`);
                    }
                }
            } else {
                console.log(`Role with ID ${roleID} not found.`);
            }
        } else {
            console.log(`No role found for emoji ${emoji} on message ID ${message.id}.`);
        }
    } catch (error) {
        console.error(`Error handling reaction for user ${user.username}:`, error);
    }
}

  
  export async function registerOldReactions() {
    try {
        const result = await pool.query('SELECT * FROM reactions_table');
        const reactionData = result.rows;

        if (reactionData.length === 0) {
            console.log('No old reactions found.');
            return;
        }

        for (const row of reactionData) {
            const { server_id, channel_id, message_id, emoji, role_id } = row;

            // Fetch guild, channel, and message
            const guild = await client.guilds.fetch(server_id);
            const channel = await guild.channels.fetch(channel_id);
            const message = await channel.messages.fetch(message_id);

            if (message) {
                console.log(`Registering listeners for message ID: ${message_id}`);

                // React to the message with stored emojis
                await message.react(emoji);  // Ensure the emoji is added to the message

                // Handle existing reactions
                const reaction = message.reactions.cache.find(r => r.emoji.name === emoji);
                if (reaction) {
                    await listenReaction(reaction, null);  // Handle existing reactions
                }
            } else {
                console.error(`Message with ID ${message_id} not found.`);
            }
        }
    } catch (error) {
        console.error('Error registering old reactions:', error);
    }
}
