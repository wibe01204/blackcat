import dotenv from "dotenv";
dotenv.config();

import Discord from "discord.js";
import Cluster from "discord-hybrid-sharding";
import fs from "node:fs";

import log from "./logger.js";
import configReslover from "./util/configReslover.js";

const config = await configReslover();
const client = new Discord.Client({
  intents: [
    Discord.IntentsBitField.Flags.Guilds,
    Discord.IntentsBitField.Flags.GuildVoiceStates,
  ],
  allowedMentions: {
    parse: ["users"],
    repliedUser: false,
  },
  presence: {
    status: "idle",
    activities: [
      {
        name: "載入中... 請稍等",
        type: "COMPETING",
      },
    ],
  },
  shards: Cluster.data.SHARD_LIST,
  shardCount: Cluster.data.TOTAL_SHARDS,
});
client.cluster = new Cluster.Client(client);

client.commands = new Discord.Collection();
client.players = new Map();
client.config = config;
client.logger = log;

let commandFiles = fs
  .readdirSync("./src/commands/")
  .filter((file) => file.endsWith(".js"));
commandFiles.forEach(async (cmd) => {
  let command = (await import(`./commands/${cmd}`)).default;
  client.commands.set(command.data.name, command);
});

const eventFiles = fs
  .readdirSync("./src/events")
  .filter((file) => file.endsWith(".js"));
eventFiles.forEach(async (event) => {
  const eventFile = (await import(`./events/${event}`)).default;
  if (eventFile.once) {
    client.once(eventFile.event, (...args) =>
      eventFile.run(client, ...args),
    );
  } else {
    client.on(eventFile.event, (...args) =>
      eventFile.run(client, ...args),
    );
  }
});

client.login(config.token);
