// Public site content and links. Keep private API keys in .env.local, not here.
export const siteProperties = {
  identity: {
    name: 'Yuvaraj Pradhan',
    initials: 'YP',
    creatorName: 'UV',
    channelName: 'IAmUV',
    channelHandle: '@UVIsGaming',
    youtubeChannelId: 'UC26MiwEqjyBe88e-LA0_jvg',
  },
  // Shown only when the live YouTube feed cannot be loaded.
  fallbackVideos: {
    recent: [
      {
        id: '4KNFzjDPd8o',
        title: 'SUOMING-HSIN Unison 41 sec DRAGON (Resonant Tower Foor 4) [WUTHERING WAVES 3.7]',
      },
      {
        id: 'FKbas0dkV0M',
        title:
          'SUOMING-HSIN Unison 3430 Points in Whimpering Wastes - HIGH PING CLEAR [WUTHERING WAVES 3.7]',
      },
      {
        id: 'e4LNL6gOysI',
        title: 'SUOMING-HSIN Unison 41 sec Fleurdelys (Echoing Tower Foor 4) [WUTHERING WAVES 3.7]',
      },
    ],
    mostViewed: {
      id: 'Xw-qBUXNcMI',
      title: 'All Hidden Chests in Realm of Ego Mirrors in the Mirror [Wuthering Waves 2.0]',
    },
  },
  links: {
    email: '',
    businessEmail: 'mrkittykatisgaming@gmail.com',
    youtube: 'https://www.youtube.com/@UVIsGaming',
    instagram: 'https://www.instagram.com/yt_iamuv/',
    discord: 'https://discord.gg/wbu4Y4Npu2',
    x: 'https://x.com/kitty_kat54787',
    twitch: 'https://www.twitch.tv/iammruv',
    github: '',
    linkedin: '',
  },
  socialLabels: {
    instagram: '@yt_iamuv',
    discord: 'THE COMMUNITY',
    x: '@kitty_kat54787',
  },
  metadata: {
    portfolio: {
      title: 'Software Developer',
      description:
        'software developer focused on Java, enterprise applications, and creative work.',
    },
    gaming: {
      title: 'Gaming & Wuthering Waves',
      description: 'gaming videos, Wuthering Waves gameplay, and the next games on the horizon.',
    },
  },
  portfolio: {
    about: [
      "I'm a software developer with a particular interest in Java and enterprise applications. I enjoy working through the moving parts of a system and finding a clear, practical way forward.",
      'This space brings together the technical work I care about and the other things I make along the way.',
    ],
    slides: [
      {
        id: 'engineering',
        theme: 'signal',
        kicker: 'SOFTWARE DEVELOPER  /  JAVA SPECIALIST',
        headline: ['ENGINEERING', 'WHAT', 'COMES NEXT.'],
        description:
          'I build thoughtful software for complex problems — with a focus on Java and enterprise applications.',
        visualLabel: 'JAVA / ENTERPRISE',
        visualCode: 'SYSTEMS',
      },
      {
        id: 'architecture',
        theme: 'ice',
        kicker: 'ARCHITECTURE  /  APPLICATIONS',
        headline: ['COMPLEXITY,', 'MADE', 'CLEAR.'],
        description:
          'From backend foundations to the details people interact with, I care about how the whole system works.',
        visualLabel: 'DESIGN / DELIVERY',
        visualCode: 'THINKING',
      },
      {
        id: 'craft',
        theme: 'ember',
        kicker: 'ENGINEERING  /  CURIOSITY',
        headline: ['KEEP', 'BUILDING', 'BETTER.'],
        description:
          'I care about the details that make software useful, maintainable, and a pleasure to work with.',
        visualLabel: 'THINK / BUILD',
        visualCode: 'EVOLVE',
      },
    ],
    focusAreas: [
      {
        title: 'Java development',
        detail: 'Building dependable application logic with a language made for the long run.',
        tags: ['JAVA', 'BACKEND', 'PROBLEM SOLVING'],
        className: 'card-java',
        glyph: '{ }',
      },
      {
        title: 'Enterprise applications',
        detail:
          'Thinking in systems: maintainability, integration, and the people behind the workflows.',
        tags: ['ARCHITECTURE', 'INTEGRATION', 'SYSTEMS'],
        className: 'card-enterprise',
        glyph: '⊞',
      },
      {
        title: 'Product thinking',
        detail:
          'Connecting technical choices with clear interfaces and the experience of using them.',
        tags: ['EXPLORATION', 'UI', 'EXPERIENCE'],
        className: 'card-creative',
        glyph: '✳',
      },
    ],
  },
  gaming: {
    introHighlight: 'a content creator who loves gaming.',
    intro:
      "I share gameplay, chase the good moments, and make videos about the games I can't put down.",
    games: [
      {
        id: 'wuthering',
        name: 'Wuthering Waves',
        eyebrow: 'CURRENT FOCUS',
        titleTop: 'WUTHERING',
        titleEm: 'WAVES.',
        description:
          'Right now, Wuthering Waves is where I spend most of my time. Expect gameplay, team experiments, tough clears, and the moments that make a great run worth sharing.',
        buttons: [
          {
            label: 'GUIDES',
            url: 'https://www.youtube.com/playlist?list=PL2I7Q3ZA7gL6dGe5Vp1e2zR_dzJzSdVgc',
          },
          {
            label: 'CHARACTER GUIDES',
            url: 'https://www.youtube.com/playlist?list=PL2I7Q3ZA7gL4wroK5maXH7aOVKZ3DKaK9',
          },
        ],
      },
      {
        id: 'next-game',
        name: 'Game Slot 02',
        placeholder: true,
        eyebrow: 'SECOND SLOT / PLACEHOLDER',
        titleTop: 'NEXT',
        titleEm: 'GAME.',
        description:
          "Another game I'm playing will be featured here. Replace this placeholder in src/site-properties.js when it's ready.",
        buttons: [{ label: 'GUIDES' }, { label: 'CHARACTER GUIDES' }],
      },
    ],
    otherGames: [
      {
        id: 'beast-of-reincarnation',
        name: 'Beast of Reincarnation',
        titleTop: 'BEAST OF',
        titleEm: 'REINCARNATION.',
        slogan: 'BIG ENEMIES, PARRIES AND A DOG/WOLF',
        description:
          'Set in post-apocalyptic Japan in the year 4026, it follows Emma, a blight-afflicted warrior, and her dog Koo on a journey to purge corruption from the land. The "one-person, one-dog" combat blends real-time swordplay with tactical commands for Koo.',
        rating: '7',
        playlistUrl: 'https://www.youtube.com/playlist?list=PLH-A9MlOJKy0',
        imageKey: 'bor_emmaKoo1',
        shotKey: 'bor_emmaKoo',
        shotPosition: '72% 50%',
      },
      {
        id: 'phantom-blade-zero',
        name: 'Phantom Blade Zero',
        titleTop: 'PHANTOM BLADE',
        titleEm: 'ZERO.',
        slogan: 'PARRIES MEETS STYLE',
        description:
          'Set in the dark martial arts realm of the Wulin, players control Soul, an elite assassin framed for murdering his leader and racing against a fatal curse to clear his name. Featuring the series’ signature kungfupunk world, it offers single-player, semi-open world exploration, intricate weapon systems, and fluid martial arts combat.',
        rating: '*',
        imageKey: 'soul-assassin',
        shotKey: 'soul-phantom-blade',
        shotPosition: '75% 40%',
      },
    ],
    follow:
      "The good bits don't stop when the video ends. Find the stream, join the chat, and stay close to whatever comes next.",
    upcoming:
      "There's always another game on the horizon. These are the worlds I'm looking forward to exploring next.",
    channel: 'Gameplay, streams, experiments, and whatever comes next. Join me on the channel.',
  },
}
