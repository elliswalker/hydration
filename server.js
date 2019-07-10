// initializing constants/variables
const Discord = require('discord.js');
const client = new Discord.Client();
const config = require('./config.json');
const fs = require('fs');
const Enmap = require('enmap');
const EnmapLevel = require('enmap-level');
client.hydrationSettingsTable = new Enmap ({ name: 'hydrationSettings', autoFetch: true, fetchAll: false });
const prefix = config.prefix;
const onlineMembers = [];
const onlineUptime = [];
const onlineTimer = [];
var lastReminder = [];
var hydrationLoop;
var thanks = ['thank'];
var today = new Date(), lastUpdate;

// creates defaultSettings for people who join in
const defaultSettings = { dehydration: true, hydrationConstant: 1 };

// bot comes online using specific bot token
client.login(process.env.TOKEN);

// initialises tables when bot loads up
client.on('ready', () =>
{
  console.log('I am ready!');
  client.channels.get(config.console).send('``` I am ready! ```');
  client.user.setActivity('h!help for more info');
  client.setMaxListeners(11);
});

function thanksCheck(content)
{
  for (var x of thanks)
  {
    if (content.indexOf(x) >= 0)
    {
      return true;
    }
  }
  console.log('false');
  return false;
}

// upon receiving a message
client.on('message', message =>
{
  // receives arguments from user's message and their current hydration settings
  const args = message.content.slice(prefix.length).trim().split(/ +/g);
  const command = args.shift().toLowerCase();
  const currentSettings = client.hydrationSettingsTable.get(message.author.id);
  if (message.isMentioned(client.user) && (thanksCheck(message.content)))
  {
    setTimeout(function() { message.channel.send("You're welcome, <@" + message.author.id.toString() + '>!'); }, Math.random() * 3000);
  }
  // fizzles when user tries to direct message bot
  if (message.content.indexOf(config.prefix) !== 0 || message.channel.type == 'dm') {return;}

  // finds corresponding hydration-room of the server from which message was sent
  const hydrationRoom = message.guild.channels.find(channel => channel.name === 'hydration_room');

  // sends series of commands user can use
  if (command === 'help')
  {
    message.author.send('Commands:```h!hydrate - opt into Stay Hydrated Bot\'s reminders (must go offline then online again) \n\nh!dehydrate - opt out of Stay Hydrated Bot\'s reminders \n\nh!interval [number] - sets how often you receive reminders while online (Default is 1 hour). \n\nh!dm - change whether you receive your hydration reminders via direct message (default is via hydrtion_room) \n\n Note: You will not receive reminders when you are away or on Do Not Disturb```');
  }
  // opt out of reminders
  else if (command === 'dehydrate')
  {
    client.hydrationSettingsTable.set(message.author.id, defaultSettings);
    hydrationRoom.send('<@' + message.author.id.toString() + '> will no longer receive hydration reminders.');
    consoleToChannel(message.author.id + ' opted out of reminders.');
    message.delete();
  }
  // opt into reminders
  else if (command === 'hydrate')
  {
    if (currentSettings.dehydration !== false)
    {
      currentSettings.dehydration = false;
      client.hydrationSettingsTable.set(message.author.id, currentSettings);
      hydrationRoom.send('<@' + message.author.id.toString() + '> will begin receiving hydration reminders (Please go offline then online now).');
      consoleToChannel(message.author.id + ' opted in reminders.');
      message.delete();
    }
    else
    {
      hydrationRoom.send('You are already receiving reminders');
    }
  }
  // takes an argument that is an integer and adjusts the hydrationConstant associated with their id number
  else if (command === 'interval')
  {
    let constant = args[0];
    if (constant < 1 && message.author.id !== config.ownerID)
    {
      // message sent when int constant is too small
      message.author.send('The time between reminders must be at least 1 hour.');
      return;
    }
    else if (!constant || isNaN(constant))
    {
      // message sent when int constant does not exist
      message.author.send('Please input a number for the amount of hours between reminders (h!interval [number])');
      return;
    }
    else if (constant > 24)
    {
      // message sent when int constant is too big
      message.author.send('The time between reminders must be at most 24 hours.');
      return;
    }

    // sets the new reminder time into the table
    currentSettings.hydrationConstant = constant;
    client.hydrationSettingsTable.set(message.author.id, currentSettings);
    hydrationRoom.send('You will now receive reminders every ' + constant + ' hour(s). (Please go offline and online for the changes to take effect.)');
    consoleToChannel(message.author.id + ' changed their constant to ' + constant);
  }
  else if (command === 'dm')
  {
    if (!currentSettings.dm || currentSettings.dm == false)
    {
      currentSettings.dm = true;
      client.hydrationSettingsTable.set(message.author.id, currentSettings);
      message.author.send('You will now begin receiving reminders via direct message.');
    }
    else if (currentSettings.dm == true)
    {
      currentSettings.dm = false;
      client.hydrationSettingsTable.set(message.author.id, currentSettings);
      message.author.send('You will now begin receiving reminders via from the hydration_room channel.');
    }
  }
});

// when user's online status changes
client.on('presenceUpdate', (oldMember, newMember) =>
{

  // stores info of user before their presence changed and after wards
  const oldMemberStatus = oldMember.presence.status;
  const newMemberID = newMember.id;
  var status = client.users.get(newMemberID).presence.status;
  var hydrationChannel;
  // if user has yet to have any hydration settings, assign default settings
  if (!client.hydrationSettingsTable.get(newMemberID))
  {
    client.hydrationSettingsTable.set(newMemberID, defaultSettings);
  }
  // grabs settings from table
  const currentSettings = client.hydrationSettingsTable.get(newMemberID);

  // set place where users will receive reminders
  if (!currentSettings.dm || currentSettings.dm == false)
  {
    hydrationChannel = newMember.guild.channels.find(channel => channel.name === 'hydration_room');
  }
  else
  {
    hydrationChannel = newMember;
  }
  // for clearing onlineDaily - next 8 lines taken from stack overflow - should update with luxon library sometime
  // If we haven't checked yet, or if it's been more than 30 seconds since the last check
  var time = new Date();
  if (!lastUpdate || (time.getTime() - lastUpdate.getTime()) > 30000)
  {
    // Set the last time we checked, and then check if the date has changed.
    lastUpdate = time;
    if (time.getDate() !== today.getDate())
    {
      // If the date has changed, set the date to the new date, and refresh stuff.
      today = time;
      client.hydrationSettingsTable.set('onlineDaily', []);
      consoleToChannel('Clearing onlineDaily...');
    }
  }

  // add members to onlineMembers and onlineUptime when they come online, if they are not a bot, away, or on dnd
  if (client.users.get(newMemberID).bot != true)
  {
    if(oldMemberStatus === 'offline' || oldMemberStatus === 'dnd')
    {
      if (status === 'online' || status === 'idle')
      {
        consoleToChannel(newMemberID + ' has logged in.');
        if (currentSettings.dehydration == false)
        {
          // sends daily reminder if they are not in onlineDaily array
          if (client.hydrationSettingsTable.get('onlineDaily').includes(newMemberID) !== true)
          {
            client.hydrationSettingsTable.push('onlineDaily', newMemberID);
            console.log('Daily reminder sent');
            hydrationChannel.send('Hello ' + client.users.get(newMemberID).toString() + '. This is your daily reminder to stay hydrated!');
          }
          // adds user to array of currently online users that opted into reminders
          if (onlineMembers.includes(newMemberID) != true)
          {
            var reminderTime = new Date;
            onlineMembers.push(newMemberID);
            onlineUptime.push(1);
            onlineTimer.push(setTimeout(hydrateReminder, currentSettings.hydrationConstant * 3600000));
            lastReminder.push(reminderTime);
            consoleToChannel('Reminding ' + newMemberID + ' in ' + currentSettings.hydrationConstant + ' hour(s)');
          }
        }
      }
    }
    // removes users from onlineMember array and stops any running reminders
    else if ((status === 'offline' || status === 'dnd') && onlineMembers.includes(newMemberID) === true)
    {
      var memberIndex = onlineMembers.indexOf(newMemberID);
      onlineUptime.splice(memberIndex, 1);
      onlineMembers.splice(memberIndex, 1);
      clearTimeout(onlineTimer[onlineMembers.indexOf(newMemberID)]);
      onlineTimer.splice(memberIndex, 1);
      lastReminder.splice(memberIndex, 1);
      consoleToChannel(newMemberID + ' has logged out. Stopping ' + newMemberID + '\'s reminders');
    }
  }

  // reminder function
  function hydrateReminder()
  {
    // failsafe for if user doesnt get removed from onlineMembers for some reason
    memberIndex = onlineMembers.indexOf(newMemberID);
    if (status === 'online' || status === 'idle')
    {
      console.log(newMemberID + ' is' + status);
      if (onlineMembers.includes(newMemberID) == true && currentSettings.dehydration == false)
      {
        // another failsafe for when there are two running reminders or user is in multiple servers - also needs to be updated with luxon
        var currentReminder = new Date;
        if (currentReminder.getTime() - lastReminder[onlineMembers.indexOf(newMemberID)].getTime() > currentSettings.hydrationConstant * 3600000 - 2000)
        {
          lastReminder[memberIndex] = currentReminder;
          var hour = onlineUptime[memberIndex] * currentSettings.hydrationConstant;
          hydrationChannel.send(client.users.get(newMemberID).toString() + ', You\'ve been online for over ' + hour + ' hour(s). By this point, you should have consumed ' + hour  * 4 + 'oz (' + hour * 120 + 'mL) of water to maintain optimum hydration.');
          onlineUptime[onlineMembers.indexOf(newMemberID)]++;
          consoleToChannel(newMemberID + ' has been reminded. Reminding ' + newMemberID + ' again in ' + currentSettings.hydrationConstant + ' hour(s).');
          setTimeout(hydrateReminder, currentSettings.hydrationConstant * 3600000);
        }
      }
    }
  }
});
// sends console stuff to private discord server (used a lot for troubleshooting and debugging because glitch doesn't store all their console logs)
function consoleToChannel(output)
{
  console.log(output);
  client.channels.get(config.console).send('```' + output + '```');
}

// eval command - taken from anidiotsguide_old.gitbooks.io
function clean(text)
{
  if (typeof (text) === 'string')
  {
    return text.replace(/`/g, '`' + String.fromCharCode(8203)).replace(/@/g, '@' + String.fromCharCode(8203));
  }
  else
  {
    return text;
  }
}

client.on('message', message =>
{
  const args = message.content.split(' ').slice(1);

  if (message.content.startsWith(config.prefix + 'eval'))
  {
    if(message.author.id !== config.ownerID && message.author.id !== config.botID) return;
    try
    {
      const code = args.join(' ');
      let evaled = eval(code);

      if (typeof evaled !== 'string')
      {
        evaled = require('util').inspect(evaled);
      }

      message.channel.send(clean(evaled), { code:'xl' });
    }
    catch (err)
    {
      message.channel.send(`\`ERROR\` \`\`\`xl\n${clean(err)}\n\`\`\``);
    }
  }
});

// self ping every 5 minutes - provided by glitch.com
const http = require('http');
const express = require('express');
const app = express();
app.get('/', (request, response) =>
{
  response.sendStatus(200);
});
app.listen(process.env.PORT);
setInterval(() =>
{
  http.get(`http://${process.env.PROJECT_DOMAIN}.glitch.me/`);
}, 280000);