"use strict";

/********************************************************************

music.js script: Defines the music and sound classes.

*********************************************************************/

class SoundUnit
{
  //An abstraction of a sound. Exists primarily because I don't want to fully
  //commit to using Pizzicato and would like some abstraction in my system.
  //Can be played and stopped.
  constructor(type, soundLength, options)
  {
    //Type corresponds to "source" in the Pizzicato.Sound constructor.
    this.type = type;

    //soundLength is how long the sound will be played, in ms.
    this.soundLength = soundLength;

    //used for Pizzicato sound objects
    this.options = options;

    //The time the sound started, in ms.
    this.timeStarted = null;

    //Whether the sound is currently playing.
    this.playing = false;

    this.effects = [];
  }

  addEffect(effect)
  {
    //Adds an effect to the sound.
    this.effects.push(effect);
  }

  initialize()
  {
    //Creates the Pizzicato sound element. Potentially would make more sense to
    //create this in .play() instead, although I feel as though it would be safer
    //here? Depends on how memory usage/time delay works out
    this.sound = new Pizzicato.Sound({
      source: this.type,
      options: this.options
    });

    for (let i = 0; i < this.effects.length; i++)
    {
      this.sound.addEffect(this.effects[i]);
    }
  }

  lengthCheck(currentTime)
  {
    //Checks to see whether the sound has played for at least its length.
    if ((currentTime-this.soundLength) < this.timeStarted)
    {
      return false;
    }
    return true;
  }

  play()
  {
    //Plays this sound. Note that the sound itself does not check to see if it
    //should stop based on its length, rather this is done by the Song class
    //as it's being played.
    this.initialize();
    this.sound.play();
    this.timeStarted = Date.now();
    this.playing = true;
  }

  stop()
  {
    //Stops this sound.
    if (this.playing)
    {
      this.sound.stop();
      this.playing = false;
      this.timeStarted = null;
    }
  }

  getCopy()
  {
    //Returns a copy of this sound.
    let newSound = new SoundUnit(this.type, this.soundLength, this.options);
    return newSound;
  }

  destroy()
  {
    //be responsible and free the sound from memory
    console.log("sound cleaned!");

    if (this.sound != undefined)
    {
      this.sound.disconnect();
    }

    this.sound = undefined;
  }
}

class MusicScore
{
  //Music score class. Stores sounds, and when they are played in 2 arrays. This
  //is to improve performance while playing a song (how needed this is is debatable,
  //however the optimization seems potentially worth it? Another layer of abstraction
  //also seems reasonable to me)

  constructor()
  {
    this.sounds = [];
    this.timeline = [];
  }

  addSound(sound, time)
  {
    //Adds a sound to the score. "sound" ought to be a member of the SoundUnit
    //class, and "time" is when it's played in the score in milliseconds.
    this.sounds.push(sound);
    this.timeline.push(time);
  }

  getCopy()
  {
    //Returns a copy of this score.

    let newScore = new MusicScore();

    for (let i = 0; i < this.sounds.length; i++)
    {
      newScore.sounds.push(this.sounds[i].getCopy());
    }
    for (let i = 0; i < this.sounds.length; i++)
    {
      newScore.timeline.push(this.timeline[i]);
    }

    return newScore;
  }

  sort()
  {
    //Sorts the timeline and sounds to be in chronological order, which is _required_
    //for the Song class to function.
    let soundCompare = function (a, b)
    {
      return a[0]-b[0];
    }

    for (let i = 0; i < this.sounds.length; i++)
    {
      this.sounds[i] = [this.timeline[i], this.sounds[i]];
    }

    this.sounds.sort(soundCompare);

    for (let i = 0; i < this.sounds.length; i++)
    {
      this.sounds[i] = this.sounds[i][1];
    }

    this.timeline.sort(function (a, b) { return a-b; });
  }
}

class Song
{
  //Song class. Handles playing through a score, which stores sounds and a timeline
  //for when those sounds are played.

  constructor()
  {
    //Score objects.
    this.storedScore = null;
    this.activeScore = null;

    //Sounds currently being played.
    this.activeSounds = [];

    //Which sound is being played? Must start at -1 for the song playing algorithm
    //to work properly.
    this.lastSoundPlayed = -1;

    //Time the song started.
    this.timeStarted = null;
  }

  setScore(score)
  {
    //Sets the current score of the song.
    this.storedScore = score;
  }

  playSound(sound)
  {
    //Used for playing a song in the activeScore. Use of this function outside
    //of that context WILL BREAK EVERYTHING. Would be nice if JavaScript had things
    //like private data encapsulation, but for now I'll just put in this clear warning:
    //DON'T CALL THIS FUNCTION OUTSIDE OF songTick()!
    this.activeSounds.push(sound);
    sound.play();
  }

  songTick()
  {
    //Function called by an interval called by a SongPlayer class.
    //setInterval() has some weird interactions with "this", but that's handled
    //by a bind() in the setInterval bit.

    //Find sounds that need to be played
    let currentTime = Date.now();
    let songProgress = currentTime-this.timeStarted;
    for (let i = this.lastSoundPlayed+1; i < this.activeScore.timeline.length; i++)
    {
      if (this.activeScore.timeline[i] < songProgress)
      {
        this.playSound(this.activeScore.sounds[i]);
        this.lastSoundPlayed = i;
      }
      else
      {
        break;
      }
    }

    //Remove complete sounds

    let soundsToRemove = [];

    for (let i = 0; i < this.activeSounds.length; i++)
    {
      if (this.activeSounds[i].lengthCheck(currentTime))
      {
        this.activeSounds[i].stop();
        soundsToRemove.push(i);
      }
    }

    for (let i = this.activeSounds.length-1; i >= 0; i--)
    {
      for (let removeIndex = 0; removeIndex < soundsToRemove.length; removeIndex++)
      {
        if (i === soundsToRemove[removeIndex])
        {
          this.activeSounds.splice(i, 1);
        }
      }
    }

    //Check if sound is complete
    if (this.lastSoundPlayed >= this.activeScore.timeline.length-1 && this.activeSounds.length === 0)
    {
      setTimeout(function () { this.stop() }.bind(this), 1000);

      return false;
    }
    return true;
  }

  play()
  {
    //Play the Score stored by this Song.
    this.activeScore = this.storedScore.getCopy();
    this.activeScore.sort();

    this.timeStarted = Date.now();
    this.lastSoundPlayed = -1;

    console.log(this.activeScore.timeline);
  }

  stop()
  {
    //Stop the song.
    if (this.activeScore != null)
    {
      for (let i = 0; i < this.activeScore.sounds.length; i++)
      {
        if (this.activeScore.sounds[i].playing)
        {
          this.activeScore.sounds[i].stop();
        }
        this.activeScore.sounds[i].destroy();
      }
    }

    this.activeScore = null;
  }

  getLength()
  {
    //Returns the length of the song in milliseconds.
    //TODO: at the moment this returns when the last note starts playing, which
    //is a decent approximant but does not actually reflect the true length of
    //the song.
    return this.storedScore.timeline[this.storedScore.timeline.length-1];
  }
}

class MusicPlayer
{
  //Class for playing songs.
  constructor()
  {
    this.songs = [];
    this.songPlaying = null;
    this.updateInterval = null;
  }

  addSong(song, callback)
  {
    this.songs.push(song);

    //Used for UI stuff to make song creation asynchronous, avoiding any
    //potential pauses.
    if (callback !== undefined)
    {
      callback();
    }
  }

  removeSong(index)
  {
    this.songs.splice(index, 1);
  }

  checkInterval(result)
  {
    //Used for checking the result of the songTick interval when a song is
    //playing. If it returns false, stop the song after a second (to avoid
    //echo effects from suddenly cutting out)
    if (!result)
    {
      setTimeout(function () { this.stop() }.bind(this), 1000);
    }
  }

  play(index)
  {
    if (this.songPlaying != null)
    {
      this.stop();
    }
    //Plays the song stored at this.songs index "index".
    this.songs[index].play();

    if (this.updateInterval != null)
    {
      clearInterval(this.updateInterval);
    }
    //dear gods this is clunky, but basically it's a hack to get setInterval working
    //because it messes with what "this" is. bind() solves this.
    //https://stackoverflow.com/a/43014276
    //https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/bind
    this.updateInterval = setInterval(function () {this.checkInterval(this.songs[index].songTick()); }.bind(this), 10);
    this.songPlaying = index;
  }

  stop()
  {
    //Stop the currently playing song.
    if (this.songPlaying != null)
    {
      this.songs[this.songPlaying].stop();
      clearInterval(this.updateInterval);
      this.songPlaying = null;
    }
  }
}

class MusicFactory
{
  //Class for creating and composing songs.

  constructor()
  {
    //Defines how much space there is between notes.
    this.noteSpaceModifier = 400;
    //Defines the length of the notes themselves.
    this.noteLengthModifier = 1;
  }

  plantCrawler(part, data, recursionLevel)
  {
    //plantCrawler crawls the tree of a plant's parts to glean some info from
    //it. Right now the things it reads are somewhat arbitrary for the first
    //generation of my sound production, but it could go further later.

    if (data === undefined)
    {
      data = {
        maxThickness: -Infinity,
        minThickness: Infinity,

        maxLength: -Infinity,
        minLength: Infinity,

        maxSize: -Infinity,
        minSize: Infinity,

        mostChildren: 0,

        deepestChild: -1,
        partCount: -1,

        partTypes: []
      };
    }

    if (recursionLevel === undefined)
    {
      recursionLevel = 0;
    }
    else
    {
      recursionLevel++;
    }

    data.partCount++;

    data.deepestChild = Math.max(data.deepestChild, recursionLevel);
    data.mostChildren = Math.max(data.mostChildren, part.children.length);

    if (!data.partTypes.includes(part.name))
    {
      data.partTypes.push(part.name);
    }

    data.minSize = Math.min(data.minSize, part.thickness*part.length);
    data.maxSize = Math.max(data.maxSize, part.thickness*part.length);

    data.maxLength = Math.max(data.maxLength, part.length);
    data.minLength = Math.min(data.minLength, part.length);

    data.maxThickness = Math.max(data.maxThickness, part.thickness);
    data.minThickness = Math.min(data.minThickness, part.thickness);

    for (let i = 0; i < part.children.length; i++)
    {
      data = this.plantCrawler(part.children[i], data, recursionLevel);
    }

    return data;
  }

  getAllChildrenToLevel(part, limit, ongoingList, depth)
  {
    //TODO: should probably be a function in the Part class?
    if (depth === undefined)
    {
      depth = 0;
    }
    if (ongoingList === undefined)
    {
      ongoingList = [];
    }

    if (depth != 0)
    {
      ongoingList.push(part)
    }

    if (depth < limit)
    {
      for (let i = 0; i < part.children.length; i++)
      {
        this.getAllChildrenToLevel(part.children[i], limit, ongoingList, depth+1);
      }
    }

    return ongoingList;
  }

  getChildrenWeights(part)
  {
    //Function for quantifying the relative "importance" of each of a part's
    //children.

    let directChildren = this.getAllChildrenToLevel(part, 1);
    let childrenWeight = [];

    for (let i = 0; i < directChildren.length; i++)
    {
      //get number of total children
      childrenWeight.push(this.getAllChildrenToLevel(directChildren[i], Infinity).length+1);
    }

    let weightSum = 0;

    for (let i = 0; i < childrenWeight.length; i++)
    {
      weightSum += childrenWeight[i];
    }

    for (let i = 0; i < childrenWeight.length; i++)
    {
      childrenWeight[i] = (childrenWeight[i])/weightSum;
    }

    return childrenWeight;
  }

  partSegmentSounds(part, totalLength, timeScalar, ongoingScore, totalDepth, currentDepth)
  {
    let childrenWeight = this.getChildrenWeights(part);
    //Weighing the children is done, now let's assign them lengths

    let soundLengths = [];

    for (let i = 0; i < childrenWeight.length; i++)
    {
      soundLengths.push(totalLength*childrenWeight[i]);
    }

    let soundTimes = [];
    let soundTimeTotal = 0;

    for (let i = 0; i < childrenWeight.length; i++)
    {
      soundTimes.push(soundTimeTotal);
      soundTimeTotal += soundLengths[i];
    }

    let sounds = [];

    if (ongoingScore === undefined)
    {
      ongoingScore = new MusicScore();
    }

    //Create the SoundUnit.
    //TODO: Make this more sophisticated, different ways to map different part
    //variables to things like frequency
    for (let i = 0; i < soundTimes.length; i++)
    {
      let newSound = new SoundUnit("wave", (soundLengths[i]/2)*this.noteLengthModifier, {
        frequency: 523+(part.children[i].relativeRotation.y % Math.PI*2)*73.85,
        volume: Math.max((1-(currentDepth/totalDepth))-0.3, 0.1)
      });
      newSound.attack = 1.5;
      newSound.release = 1.5;

      //Sound effects

      var stereoPanner = new Pizzicato.Effects.StereoPanner({
        pan: (part.stickPosition*2)-1
      });

      var delay = new Pizzicato.Effects.Delay({
      feedback: 0.3,
      time: 0.2,
      mix: 0.3
      });

      newSound.addEffect(stereoPanner);
      newSound.addEffect(delay);

      sounds.push(sounds);

      ongoingScore.addSound(newSound, soundTimes[i]+timeScalar);
    }

    return ongoingScore;
  }

  getAllSegmentSounds(part, totalLength, timeScalar, ongoingScore, plantData, currentDepth)
  {
    //Current main function for 1st generation sound creation

    if (ongoingScore === undefined)
    {
      ongoingScore = new MusicScore();
    }

    let childrenWeight = this.getChildrenWeights(part);
    //Weighing the children is done, now let's assign them lengths

    let soundLengths = [];

    for (let i = 0; i < childrenWeight.length; i++)
    {
      soundLengths.push(totalLength*childrenWeight[i]);
    }

    let soundTimes = [];
    let soundTimeTotal = 0;

    for (let i = 0; i < childrenWeight.length; i++)
    {
      soundTimes.push(soundTimeTotal+timeScalar);
      soundTimeTotal += soundLengths[i];
    }

    if (part.children.length > 0)
    {
      this.partSegmentSounds(part, totalLength, timeScalar, ongoingScore, plantData.deepestChild, currentDepth);

      for (let i = 0; i < part.children.length; i++)
      {
        this.getAllSegmentSounds(part.children[i], soundLengths[i], soundTimes[i], ongoingScore, plantData, currentDepth+1);
      }
    }

    return ongoingScore;
  }

  makeSongFromPlant(plant, garden, callback)
  {
    //Makes a song from a plant. The first generation of Plant Sounds will not
    //have a large amount of customizability, as it may need a lot more finetuning
    //to get it to work that way.

    let song = new Song();

    //PHASE 1: The walkabout.
    //Find out some details about the plant.
    let plantData = this.plantCrawler(plant.rootPart);

    //PHASE 2: The creation.
    //Big phase!

    let newScore = this.getAllSegmentSounds(plant.rootPart, plantData.partCount*this.noteSpaceModifier, 0, new MusicScore(), plantData, 0)
    song.setScore(newScore);

    return song;
  }

  makeTestSong()
  {
    //Just returns a simple song for testing purposes.
    let song = new Song()

    let score = new MusicScore()

    score.addSound(new SoundUnit("wave", 4000, {frequency: 440}), 0);
    score.addSound(new SoundUnit("wave", 1000, {frequency: 880}), 2000);

    song.setScore(score);

    return song;
  }
}

let musicPlayer = new MusicPlayer();
let musicFactory =  new MusicFactory();
Pizzicato.volume = 0.5;

function testMusic()
{
  musicPlayer.addSong(musicFactory.makeTestSong());
  musicPlayer.play(0);
}
