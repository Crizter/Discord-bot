import {
  SlashCommandBuilder,
  ChannelType,
  PermissionsBitField,
  Events,
  MessageReaction,
} from "discord.js";

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
        .setDescription("Enter the  emoji to react with.")
        .setRequired(true)
    ),
].map((command) => command.toJSON());

const emojiRoleMap = {}; //  filled dynamically

export async function handleReactions(interaction) {
  if (!interaction.isCommand()) return;

  let { commandName, options, guild, member } = interaction;
  guild = interaction.guild;

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

    // Send the message
    try {
      const sentMessage = await targetChannel.send(messageContent);

      // Add reactions using the input emojis
      await sentMessage.react(emoji);
    
      emojiRoleMap[emoji] =targetRole.id;

      // Equip or unequip the role
      if (targetRole && member) {
        const botMember = await guild.members.fetch(member.id);

        const botHighestRole = botMember.roles.highest;
        console.log(
          "tells the member id and highest bot role",
          botMember.user.id
        );

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
            await interaction.reply(
              `Role ${targetRole.name} has been equipped.`
            );
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
      } else {
        await interaction.reply(`Message sent to ${targetChannel.name}.`);
      }
    } catch (error) {
      console.error("Error sending message or handling role:", error);
      await interaction.reply(
        "There was an error sending the message or handling the role."
      );
    }
  }
}




export async function listenReaction(reaction, user) {


  if (reaction.partial) {
    try {
      await reaction.fetch();
    } catch (error) {
      console.error("Failed to fetch reaction:", error);
      return;
    }
  }

  if (user.bot) return;

  // GET THE DATA
  const emoji = reaction.emoji.name;
  const message = reaction.message;
  const channel = message.guild;
  const guild = message.guild;
  const member = await guild.members.fetch(user.id);

  console.log(
    `User ${user.username} reacted with ${emoji} to message ID: ${message.id}`
  );

  const roleID = emojiRoleMap[emoji];
  console.log("The role id is ", roleID);

  if (roleID) {
    const role = guild.roles.cache.get(roleID);
    if (member.roles.cache.has(roleID)) {
      await member.roles.remove(roleID);
      console.log(`Role ${role.name} removed from ${user.username}`);
    } else {
      await member.roles.add(roleID);
      console.log(`Role ${role.name} added to ${user.username}`);
    }
  }
  


}
