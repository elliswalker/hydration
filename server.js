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
  var onlineDaily = [];
  var today = new Date(), lastUpdate;
client.login(process.env.TOKEN);
client.on('ready', () => 
{
  console.log('I am ready!');
  client.channels.get(config.console).send("``` I am ready! ```");
  client.user.setActivity("h!help");
  client.setMaxListeners(11);
});
//main problem; people who go on and off repeatedly may be starting several timeout, to do: enmap storage for dehydration and onlineDaily
client.on('message', message => {
  const args = message.content.slice(prefix.length).trim().split(/ +/g);
  const command = args.shift().toLowerCase();
  const hydrationChannel = message.guild.channels.find('name', 'hydration_room');
  if (message.author.bot){ if (command === 'eval'){message.delete()} } return;
  if(message.content.indexOf(config.prefix) !== 0) return;
  if(command === 'ping') 
  {
    message.channel.send('Pong!');
    message.delete();
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
  {
    message.delete();
  }
});

//hydration stuff
client.on('presenceUpdate', (oldMember, newMember) => 
{
  oldMember = oldMember.presence.status;
  const hydrationChannel = newMember.guild.channels.find('name', 'hydration_room');
  newMember = newMember.id;
  var status = client.users.get(newMember).presence.status
  var memberIndex = onlineMembers.indexOf(newMember);
  var time = new Date();
  var hydrationLoop;
  //for clearing onlineDaily - not developed by me
  // If we haven't checked yet, or if it's been more than 30 seconds since the last check
  if ( !lastUpdate || ( time.getTime() - lastUpdate.getTime() ) > 30000 ) 
  {
    // Set the last time we checked, and then check if the date has changed.
    lastUpdate = time
    if ( time.getDate() !== today.getDate() ) 
    {
      // If the date has changed, set the date to the new date, and refresh stuff.
      today = time;
      onlineDaily = [];
      consoleToChannel("Clearing onlineDaily...");
    }
  }
  //add members to onlineMembers and onlineUptime when they come online)
  if (client.users.get(newMember).bot != true)
  {
    if(oldMember === 'offline' || oldMember === 'dnd')
      {
        if (status === 'online' || status === 'idle') 
          {
            if (onlineMembers.includes(newMember) !== true)
            {
              onlineMembers.push(newMember);
              onlineUptime.push(1);
              consoleToChannel(newMember +" has logged in. Reminding " +newMember +" in 1 hour");
              loopVar = setTimeout(hydrateReminder, 3600000)
            }
            if (onlineDaily.includes(newMember) !== true)
            {
              onlineDaily.push(newMember);
              console.log("Daily reminder sent");
              //maybe move below line outside of if so it can send to multiple servers?
              hydrationChannel.send("Hello " + client.users.get(newMember).toString() + ". Remember to stay hydrated!");
            }
          }
      }
    else if ((status === 'offline' || status === 'dnd') && onlineMembers.includes(newMember) === true)
    {
      //goes to hydrate reminder because it already has a built in thing to splice out the member
      hydrateReminder();
    }
  }
  
  //reminder function
  function hydrateReminder() 
  {
    if (status === 'online' || status === 'idle') 
    {
      if (onlineMembers.includes(newMember) === true)
      {
        var hour = onlineUptime[memberIndex];
        hydrationChannel.send(client.users.get(newMember).toString() + ", You've been online for over " +hour +" hour(s). By this point, you should have consumed " +hour  * 4 +"oz (" +hour * 120 +"mL) of water to maintain optimum hydration.");
        onlineUptime[memberIndex]++;
        consoleToChannel("Reminder sent to " +newMember +". Reminding " +newMember +" again in 1 hour.");
        setTimeout(hydrateReminder, 3600000);
      }
    }
    else if ((status === 'offline' || status === 'dnd') && onlineMembers.includes(newMember) === true)
    {
      onlineUptime.splice(memberIndex, 1);
      onlineMembers.splice(memberIndex, 1);
      consoleToChannel("Stopping " +client.users.get(newMember).toString() +"'s reminders.");
      clearTimeout(loopVar);
    }
  } 
  
  //makeshift console
  function consoleToChannel(output)
  {
    console.log(output);
    client.channels.get(config.console).send("```" +output +"```");
    client.channels.get(config.console).send("h!eval onlineMembers");
    client.channels.get(config.console).send("h!eval onlineUptime");
  }
});

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
    if(message.author.id !== config.ownerID && message.author.id !== config.botID) return;
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

//self ping every 5 minutes
const http = require('http');
const express = require('express');
const app = express();

app.listen(8080);
setInterval(() => {
http.get(`http://${process.env.PROJECT_DOMAIN}.glitch.me/`);
}, 300000);
