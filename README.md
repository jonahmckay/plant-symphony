# Plant Symphony

### Made by Jonah McKay

## Brief Description

Plant Symphony is a toy application that allows you to play with procedural
generation of plant-like structures, as well as procedural music generation.

You can see it live here:
https://jonahmckay.github.io/plant-symphony/

Made for Project 3, This Time It's Personal for CART263.
https://github.com/pippinbarr/cart263-2020

Currently, it is in a rough "prototype" state, so while the main features are
present, things like the user interface are more rough than would be ideal,
and it is missing some features that I would like to implement some time in the
future.

## Technical Bits

The site runs entirely client side, although some browsers may require the site
to be run by a server as it accesses external libraries from the Internet. Plant
Symphony ought to run on all modern browsers and operating systems, but if you
find any issues, browser-specific or otherwise, please raise it on the GitHub
repository.

It uses the following JavaScript libraries/frameworks:

- [A-Frame](https://aframe.io)
- [jQuery](https://jquery.com) and [jQuery UI](https://jqueryui.com)
- [Pizzicato](https://github.com/alemangui/pizzicato)

All of these libraries are, as of April 16 2020, under the MIT License, as is
this program. These libraries are not bundled with this repository, and are
referred to by external links in index.html. If you want to run this application
offline, you'll have to download and refer to local copies of these libraries.
Otherwise, once the relevant files are loaded it should require no connection to
the Internet.

## Artist's Statement

Plant Symphony is designed as a toy-tool for exploring procedural generation and
data mapping. The surreal and abstract representation of a plant-growth in a field
on the screen is meant to be confusing at first, although the familiar signs of
a user interface provide some direction for exploration. The hope is that through
learning the tools available, a user will try to find ways to construct and experiment
with tweaking and expanding on the base plant growth rules. The addition of music
generation is to add an extra puzzle and possibility, creating plant growth patterns
for constructing certain sorts of sounds.

Plant Symphony's core is the surprise inherent in procedural generation systems,
where adding or removing rules may have behaviour that's hard or impossible to
fully predict. Humour is also a big part of the appeal of these systems, and allowing
extreme values and situations rather than attempting to restrict the generation to
"realistic" plants only allows for unusual situations.

My inspiration for playing with and exploring procedural generation systems came from a variety
of sources, mostly video games that use procedural generation systems that create
procedurally generated worlds that encourage exploration by the player, like Minecraft
and Caves of Qud While many games that use procedural world generation
create a compelling experience for world exploration, much fewer of these games
try to create an experience involving exploring the world generation system itself.
Minecraft for a while had a ["Customize" world option,](www.youtube.com/watch?v=HGjCsUAkNlU&t=4m41s) which allowed for the user to
play with various constants and settings for the world generation, however it was
scrapped after a few versions as most of the settings were cryptic sliders, with
the lack of explanation excused only by an "advanced users only!" heading.

My "part and rules" plant generation system is my attempt to make a more intuitive
procedural generation system suited to interactive play. While the present user
interface perhaps suffers from a "cryptic sliders" quality, I suspect that this
core system would be suited to a more holistic interface, which could give visual
feedback and more active ways to change the settings than just data entry. While this could
include game-like elements, my goal isn't to make Plant Symphony a game in the sense
that it would have goals or a narrative. Plant Symphony is a sandbox to play in,
with little to discover except for what the user creates for themself.
The music generation system also lends itself to the possibility of a similar
interface, allowing for mapping of different attributes of the plants to different
qualities of sound.

While this version of Plant Symphony lacks these interfaces that could improve
the experience, it does contain what I believe is the core of the experience:
playing with different systems just for the fun of seeing how they interact.
It poses questions about the act of creating, and how the tools used to do it
end up influencing the end product almost as much as the creator themself.
