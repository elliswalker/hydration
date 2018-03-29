const Discord = require('discord.js');
const client = new Discord.Client();
const config = require("./config.json");
const fs = require("fs");
const prefix = config.prefix
const onlineMembers = [];
const onlineUptime = [];
  var loopVar;
  var oldMember;
  var newMember;
const onlineDaily = [];
var today = new Date(), lastUpdate;
client.login(process.env.TOKEN);
//todo: dont hydrate person with dehydrated role, hydrate reminder for only first log in, try to assign something to var hour, eric42bass
client.on('ready', () => 
{
  console.log('I am ready!');
  client.user.setActivity("h!help");
});

client.on('message', message => {
  const args = message.content.slice(prefix.length).trim().split(/ +/g);
  const command = args.shift().toLowerCase();
  const hydrationChannel = message.guild.channels.find('name', 'hydration_room');
  if (message.author.bot) return;
  if(message.content.indexOf(config.prefix) !== 0) return;
  if(command === 'ping') 
  {
    message.channel.send('Pong!');
  } 
  else if (command === 'blah') 
  {
    message.channel.send('Meh');
  }
  else if (command === 'help')
  {
    message.author.sendMessage("h!hydrate - checks if you're receiving hydration reminders (and tells you how to receive them if you aren't).\nh!dehydrate - Removes you from receiving hydration reminders."); 
  }
  else if (command === 'loop')
  {
    if(message.author.id !== config.ownerID) {return} 
    else
    {
      var i = 0;
      message.channel.send('Loop started');
      loopVar = setInterval(testloop,10000);
      function testloop() 
      {
        message.channel.send(i);
        i++;
      }
    }
  }
  else if (command === 'stoploop')
  {
    clearInterval(loopVar);
    message.channel.send('Loop stopped');
  }
  else if (command === 'dehydrate')
  {
    if (onlineMembers.includes(message.author.id) == true)
    {
      onlineUptime.splice(onlineMembers.indexOf(message.author.id), 1);
      onlineMembers.splice(onlineMembers.indexOf(message.author.id), 1);
      hydrationChannel.send("Manually removed " + client.users.get(message.author.id).toString() + " from hydration reminders.");
      console.log(onlineMembers);
      console.log(onlineUptime);
    } 
    else
    {
      hydrationChannel.send(client.users.get(message.author.id).toString() + " is not currently being hydrated.");
    }
    } 
  else if (command ==='hydrate')
    {
      if (onlineMembers.includes(message.author.id) != true)
      {
        message.author.sendMessage("Click on the bottom left, and select 'invisible' and then 'oniline' to receive hydration reminders again.");
      }
      else
      {
        hydrationChannel.send(client.users.get(message.author.id).toString() + " is already being reminded");
      }
    }
  });

//hydration stuff
client.on('presenceUpdate', (oldMember, newMember) => 
{
  oldMember = oldMember.presence.status;
  const hydrationChannel = newMember.guild.channels.find('name', 'hydration_room');
  newMember = newMember.id;
  const index = onlineMembers.indexOf(newMember);
  var time = new Date();
  // If we haven't checked yet, or if it's been more than 30 seconds since the last check
  if ( !lastUpdate || ( time.getTime() - lastUpdate.getTime() ) > 30000 ) 
  {
    // Set the last time we checked, and then check if the date has changed.
    lastUpdate = time
    if ( time.getDate() !== today.getDate() ) 
    {
      // If the date has changed, set the date to the new date, and refresh stuff.
      today = time
      onlineDaily = [];
      console.log("Clearing onlineDaily...");
      console.log(onlineDaily);
    }
  }
  if (client.users.get(newMember).bot != true)
  {
    if(oldMember === 'offline')
      {
        if (client.users.get(newMember).presence.status === 'online' || client.users.get(newMember).presence.status === 'idle' || client.users.get(newMember).presence.status === 'dnd' ) 
          {
            if (onlineMembers.includes(newMember) != true)
            {
              onlineMembers.push(newMember);
              onlineUptime.push(1);
              console.log("Reminding " +newMember +" in 1 hour");
              console.log(onlineMembers);
              console.log(onlineUptime);
              hydrateDelay();
            }
            if (onlineDaily.includes(newMember) != true)
            {
              onlineDaily.push(newMember);
              console.log("Daily reminder sent");
              hydrationChannel.send("Hello " + client.users.get(newMember).toString() + ". Remember to stay hydrated!");
            }
          }
      }         
    else if (client.users.get(newMember).presence.status === 'offline' && onlineMembers.includes(newMember) === true)
        {
          hydrateReminder();
        }
  }
  //hydration functions
  function hydrateDelay() 
  {
    if (client.users.get(newMember).presence.status === 'online')
    {
      setTimeout(hydrateReminder, 3600000);
    }
  }
  
  function hydrateReminder() 
  {
    if (client.users.get(newMember).presence.status === 'online' &&  onlineMembers.includes(newMember) === true)
    {
      //var hour = onlineUptime[onlineMembers.indexOf(client.users.get(newMember))]
      //for some reason setting onlineUptime[onlineMembers.indexOf(client.users.get(newMember))] as a var screws up the number
      console.log("Reminder sent to " +newMember);
      hydrationChannel.send(client.users.get(newMember).toString() + ", You've been online for over " +onlineUptime[onlineMembers.indexOf(client.users.get(newMember))] +" hour(s). By this point, you should have consumed " +onlineUptime[onlineMembers.indexOf(client.users.get(newMember))] * 4 +"oz (" +onlineUptime[onlineMembers.indexOf(client.users.get(newMember))] * 120 +"mL) of water to maintain optimum hydration.");
      onlineUptime[onlineMembers.indexOf(client.users.get(newMember).id)]++;
      console.log("Reminding " +newMember +" again in 1 hour");
      console.log(onlineMembers);
      console.log(onlineUptime);
      setTimeout(hydrateReminder, 3600000);
    } 
    //problem: if last newMember was offline, this would repeat the "offline" function which would end up removing all of the objects in the array, so maybe change newMember to another variable?
    // new problem: seems to splice the last item instead of actual indexed item
    // and now stuff is occuring at half the time
    else if (client.users.get(newMember).presence.status === 'offline' && onlineMembers.includes(newMember) === true)
    {
      console.log("Stopping " +client.users.get(newMember).toString() +"'s reminders");
      onlineUptime.splice(index, 1);
      onlineMembers.splice(index, 1);
      console.log(onlineMembers);
      console.log(onlineUptime);
      newMember = onlineMembers[onlineMembers.length-1];
      //if (onlineMembers.length === 0) 
      //{
        //console.log("Clearing Loop...");
        //console.log(onlineMembers);
        //console.log(onlineUptime);
        //clearInterval(loopVar);
      //}
    }
  } 
});

//debug events
client.on("error", (e) => console.error(e));
client.on("warn", (e) => console.warn(e));
//client.on("debug", (e) => console.info(e));

//eval command
function clean(text) {
  if (typeof(text) === "string")
    return text.replace(/`/g, "`" + String.fromCharCode(8203)).replace(/@/g, "@" + String.fromCharCode(8203));
  else
      return text;
}

client.on("message", message => {
  const args = message.content.split(" ").slice(1);

  if (message.content.startsWith(config.prefix + "eval")) {
    if(message.author.id !== config.ownerID) return;
    try {
      const code = args.join(" ");
      let evaled = eval(code);

      if (typeof evaled !== "string")
        evaled = require("util").inspect(evaled);

      message.channel.send(clean(evaled), {code:"xl"});
    } catch (err) {
      message.channel.send(`\`ERROR\` \`\`\`xl\n${clean(err)}\n\`\`\``);
    }
  }
});
//self ping every 5 m,inutes
const http = require('http');
const express = require('express');
const app = express();

app.listen(8080);
setInterval(() => {
http.get(`http://${process.env.PROJECT_DOMAIN}.glitch.me/`);
}, 300000);