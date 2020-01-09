/*
    Original by Gabriel Tanner: https://www.gabrieltanner.org/blog/dicord-music-bot
*/

const Discord = require('discord.js');
const {
    prefix,
    token,
} = require('./config.json');
const ytdl = require('ytdl-core');

const client = new Discord.Client();
const queue = new Map();

client.once('ready', () => {
    console.log('Ready!');
});

client.once('reconnecting', () => {
    console.log('Reconnecting!');
});

client.once('disconnect', () => {
    console.log('Disconnect!');
});

client.on('message' , async message => {
    if (message.author.bot) return;
    if (!message.content.startsWith(prefix)) return;

    const serverQueue = queue.get(message.guild.id);
    if (message.content.startsWith(`${prefix}play`)) {
        execute(message, serverQueue);
        return;
    } 
    else if (message.content.startsWith(`${prefix}skip`)) {
        skip(message, serverQueue);
        return;
    }
    else if (message.content.startsWith(`${prefix}stop`)) {
        stop(message, serverQueue);
        return;
    }
    else {
        message.channel.ask('You need to enter a valid command!');
    }
});

async function execute(message, serverQueue) {
    const args = message.content.split(' ');
    const voiceChannel = message.member.voiceChannel;
    const permissions = voiceChannel.permissionsFor(message.client.user);
    const songInfo = await ytdl.getInfo(args[1]);
    const song = {
        title: songInfo.title,
        url: songInfo.video_url,
    };

    if (!voiceChannel) {
        return message.channel.send('You need to be in a voice channel to play music!');
    }
    
    if(!permissions.has('CONNECT') || !permissions.has('SPEAK')) {
        return message.channel.send('I need the permissions to join and speak in your voice channel.');
    }

    if(!serverQueue) {
        // Creating the contract for our queue
        const queueContract = {
            textChannel: message.channel,
            voiceChannel: voiceChannel,
            connection: null,
            songs: [],
            volume: 5,
            playing: true
        };

        // Setting the queue using our contract
        queue.set(message.guild.id, queueContract);
        
        // Pushing the song to our songs array
        queueContract.songs.push(song);

        try {
            // Here we try to join the voice chat and save our connection into our object
            let connecttion = await voiceChannel.join();
            queueContract.connection = connection;

            // Calling the play function to start a song
            play(message.guild, queueContract.songs[0]);
        } catch (error) {
            // Print error message if the bot fails to join the voice chat
            console.log(error);
            queue.delete(message.guild.id);
            return message.channel.send(error);
        }
    }
    else {
        serverQueue.songs.push(song);
        console.log(serverQueue.songs);
        return message.channel.send(`${song.title} has been added to the queue`);
    }
}

function skip(message, serverQueue) {
    if(!message.member.voiceChannel) {
        return message.channel.send('You have to be in a voice channel to stop the music!');
    }
    if(!serverQueue) {
        return message.channel.send('There is no song that I can skip!');
    }
    serverQueue.connection.dispatcher.end();
}

function stop(message, serverQueue) {
    if(!message.member.voiceChannel) {
        return message.channel.send('You have to be in a voice channel to stop the music!');
    }
    serverQueue.songs = [];
    serverQueue.connection.dispatcher.end();
}

function play(guild, song) {
    const serverQueue = queue.get(guild.id);

    if(!song) {
        serverQueue.voiceChannel.leave();
        queue.delete(guild.id);
        return;
    }

    const dispatcher = serverQueue.conenction.playStream(ytdl(song.url))
    .on('end', () => {
        console.log('Music ended!');
        serverQueue.songs.shift();
        play(guild, serverQueue.songs[0]);
    })
    .on('error', error => {
        console.error(error);
    });
    dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
}

client.login(token);