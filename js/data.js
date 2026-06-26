const APP_DATA = {
  logo: 'https://i.postimg.cc/d3TKbsF1/file-000000004fb871faa5cf0097ec3fc2bc.png',
  guestLimitUrdu: 'آپ نے مفت پڑھنے کی حد مکمل کر لی ہے۔ مزید شاعری پڑھنے کے لیے براہ کرم رجسٹر کریں یا لاگ ان کریں۔',
  guestPoemLimit: 10,
  guestLimitPromptUrdu: 'مزید شاعری پڑھنے کے لیے رجسٹر کریں یا لاگ ان کریں۔',
  guestLimitPromptEn: 'Want to read more poems? Create a free account or sign in.',
  freeLimits: {
    messages: 1000,
    bookmarks: 100,
    poemsPerDay: 30,
    profileVisits: 10
  },

  categories: [
    { id: 'ghazal', name: 'Ghazal', urdu: 'غزل', icon: '🌙', color: '#8B5CF6' },
    { id: 'nazm', name: 'Nazm', urdu: 'نظم', icon: '📜', color: '#3B82F6' },
    { id: 'shayari', name: 'Shayari', urdu: 'شاعری', icon: '✨', color: '#EC4899' },
    { id: 'quotes', name: 'Quotes', urdu: 'اقتباس', icon: '💬', color: '#10B981' },
    { id: 'romantic', name: 'Romantic', urdu: 'رومانوی', icon: '❤️', color: '#EF4444' },
    { id: 'sad', name: 'Sad', urdu: 'اداس', icon: '😢', color: '#6366F1' },
    { id: 'friendship', name: 'Friendship', urdu: 'دوستی', icon: '🤝', color: '#F59E0B' },
    { id: 'motivational', name: 'Motivational', urdu: 'حوصلہ افزا', icon: '💪', color: '#14B8A6' },
    { id: 'islamic', name: 'Islamic', urdu: 'اسلامی', icon: '🕌', color: '#22C55E' },
    { id: 'life', name: 'Life', urdu: 'زندگی', icon: '🌱', color: '#84CC16' },
    { id: 'pain', name: 'Pain', urdu: 'درد', icon: '💔', color: '#DC2626' }
  ],

  poets: [
    { id: 1, name: 'Mirza Ghalib', followers: 12500, following: 45, posts: 120, verified: true, premium: true, bio: 'Legendary Urdu poet of the Mughal era.' },
    { id: 2, name: 'Allama Iqbal', followers: 18200, following: 30, posts: 95, verified: true, premium: true, bio: 'Poet of the East and philosopher.' },
    { id: 3, name: 'Faiz Ahmed Faiz', followers: 9800, following: 60, posts: 78, verified: true, premium: false, bio: 'Revolutionary poet and intellectual.' },
    { id: 4, name: 'Parveen Shakir', followers: 7600, following: 80, posts: 65, verified: true, premium: true, bio: 'Modern Urdu poet known for feminine voice.' },
    { id: 5, name: 'Jaun Elia', followers: 11200, following: 25, posts: 88, verified: true, premium: false, bio: 'Philosopher poet of modern era.' },
    { id: 6, name: 'Ahmad Faraz', followers: 8900, following: 40, posts: 72, verified: false, premium: false, bio: 'Romantic and revolutionary poet.' },
    { id: 7, name: 'Amjad Islam Amjad', followers: 6500, following: 55, posts: 58, verified: false, premium: false, bio: 'Dramatist and poet.' },
    { id: 8, name: 'Kishwar Naheed', followers: 5400, following: 70, posts: 50, verified: true, premium: true, bio: 'Feminist poet and writer.' }
  ],

  poems: [
    { id: 1, poetId: 1, poetName: 'Mirza Ghalib', category: 'ghazal', text: 'ہزاروں خواہشیں ایسی کہ ہر خواہش پہ دم نکلے\nبہت نکلے میرے ارماں لیکن پھر بھی کم نکلے', english: 'Thousands of desires, each worth dying for...', likes: 2450, comments: 189, shares: 456, time: '3 hours ago', trending: true },
    { id: 2, poetId: 2, poetName: 'Allama Iqbal', category: 'motivational', text: 'خودی کو کر بلند اتنا کہ ہر تقدیر سے پہلے\nخدا بندے سے خود پوچھے بتا تیری رضا کیا ہے', english: 'Elevate your selfhood so high...', likes: 3200, comments: 245, shares: 678, time: '5 hours ago', trending: true },
    { id: 3, poetId: 3, poetName: 'Faiz Ahmed Faiz', category: 'romantic', text: 'دل نہ اومید تو نہیں\nنقصِ وفا تو نہیں', english: 'The heart is not without hope...', likes: 1890, comments: 134, shares: 289, time: '8 hours ago', trending: false },
    { id: 4, poetId: 4, poetName: 'Parveen Shakir', category: 'sad', text: 'وہ تو خوب تھا کہ آ گیا\nورنہ ہم بھی دل کے معاملے میں بہت اچھے تھے', english: 'It was good that he came...', likes: 1560, comments: 98, shares: 234, time: '12 hours ago', trending: true },
    { id: 5, poetId: 5, poetName: 'Jaun Elia', category: 'pain', text: 'میں بھی بہت عجیب ہوں\nایسا عجیب ہوں کہ بس\nخود کو تباہ کر لیا', english: 'I am also very strange...', likes: 2100, comments: 167, shares: 345, time: '1 day ago', trending: true },
    { id: 6, poetId: 6, poetName: 'Ahmad Faraz', category: 'ghazal', text: 'رنجش ہی سہی دل ہی دکھانے کے لیے آ\nآ پھر سے مجھے چھوڑ کے جانے کے لیے آ', english: 'If it is animosity, come to show the heart...', likes: 1780, comments: 112, shares: 267, time: '1 day ago', trending: false },
    { id: 7, poetId: 7, poetName: 'Amjad Islam Amjad', category: 'life', text: 'یہ دن بھی آئے گا\nیہ رات بھی گزرے گی', english: 'This day will also come...', likes: 980, comments: 67, shares: 145, time: '2 days ago', trending: false },
    { id: 8, poetId: 8, poetName: 'Kishwar Naheed', category: 'friendship', text: 'ہم گنہگار عورتیں\nہم بدچلن عورتیں', english: 'We sinful women...', likes: 1340, comments: 89, shares: 198, time: '2 days ago', trending: false },
    { id: 9, poetId: 1, poetName: 'Mirza Ghalib', category: 'islamic', text: 'بس کہ دشوار ہے ہر کام کا آساں ہونا\nآدمی کو بھی میسر نہیں انسانیت ہونا', english: 'It is difficult for everything to be easy...', likes: 1670, comments: 123, shares: 289, time: '3 days ago', trending: false },
    { id: 10, poetId: 2, poetName: 'Allama Iqbal', category: 'nazm', text: 'مذاق رنگیں ہے دریائے ہستی کا\nجوشِ موج سے آشکار ہوتی ہے', english: 'The river of existence is colorful...', likes: 2890, comments: 201, shares: 456, time: '3 days ago', trending: true },
    { id: 11, poetId: 3, poetName: 'Faiz Ahmed Faiz', category: 'shayari', text: 'یہ کون زندگی ہے\nیہ کون سی زندگی ہے', english: 'What kind of life is this...', likes: 1120, comments: 78, shares: 167, time: '4 days ago', trending: false },
    { id: 12, poetId: 4, poetName: 'Parveen Shakir', category: 'quotes', text: 'تمہارے آنے سے پہلے\nدنیا میں کیا تھا', english: 'Before you came, what was in the world...', likes: 890, comments: 56, shares: 123, time: '4 days ago', trending: false },
    { id: 13, poetId: 5, poetName: 'Jaun Elia', category: 'ghazal', text: 'کوئی دم کا مہمان ہے عمر سراپا درد ہے\nکیا فائدہ جوابِ سوالِ درد ملا', english: 'Life is a guest for a moment...', likes: 2340, comments: 178, shares: 389, time: '5 days ago', trending: true },
    { id: 14, poetId: 6, poetName: 'Ahmad Faraz', category: 'romantic', text: 'تیرے بغیر زندگی سے کوئی شکوہ تو نہیں\nشکوہ ہے بس ایک شکوہ ہے کہ شکوہ نہ کر سکوں', english: 'No complaint about life without you...', likes: 1560, comments: 134, shares: 278, time: '5 days ago', trending: false },
    { id: 15, poetId: 7, poetName: 'Amjad Islam Amjad', category: 'motivational', text: 'ہمت کر نا ہار\nمنزل تیرے قدموں میں ہے', english: 'Be brave, do not lose hope...', likes: 780, comments: 45, shares: 98, time: '6 days ago', trending: false },
    { id: 16, poetId: 8, poetName: 'Kishwar Naheed', category: 'sad', text: 'میں نے اپنے حصے کا کام کر دیا\nاب تم اپنا حصہ پورا کرو', english: 'I have done my part...', likes: 1230, comments: 89, shares: 201, time: '6 days ago', trending: false },
    { id: 17, poetId: 1, poetName: 'Mirza Ghalib', category: 'pain', text: 'عشق میں نہیں ہے فرق جینے اور مرنے کا\nاسی کو دیکھ کر جیتے ہیں جس کافر پہ دم نکلے', english: 'In love there is no difference between living and dying...', likes: 2890, comments: 234, shares: 567, time: '1 week ago', trending: true },
    { id: 18, poetId: 2, poetName: 'Allama Iqbal', category: 'islamic', text: 'یہ ذوقِ تلاشِ مقصود دے\nپھر دکھا خدا تجھ کو وہ منزل', english: 'Give this passion to seek the goal...', likes: 3450, comments: 267, shares: 678, time: '1 week ago', trending: true },
    { id: 19, poetId: 3, poetName: 'Faiz Ahmed Faiz', category: 'friendship', text: 'دل سے نکلنے والی آواز\nدل تک پہنچنے والی بات', english: 'The voice from the heart...', likes: 980, comments: 67, shares: 145, time: '1 week ago', trending: false },
    { id: 20, poetId: 4, poetName: 'Parveen Shakir', category: 'life', text: 'زندگی ایک سفر ہے\nہر قدم نیا ہے', english: 'Life is a journey...', likes: 1120, comments: 78, shares: 167, time: '1 week ago', trending: false },
    { id: 21, poetId: 5, poetName: 'Jaun Elia', category: 'quotes', text: 'محبت میں کوئی کمی نہیں\nبس وقت کی کمی ہے', english: 'There is no shortage in love...', likes: 1890, comments: 145, shares: 312, time: '1 week ago', trending: false },
    { id: 22, poetId: 6, poetName: 'Ahmad Faraz', category: 'nazm', text: 'تم آئے تو آیا یہ احساس\nکہ تم نہیں ہو تو کچھ بھی نہیں', english: 'When you came, this feeling came...', likes: 1450, comments: 98, shares: 234, time: '2 weeks ago', trending: false },
    { id: 23, poetId: 7, poetName: 'Amjad Islam Amjad', category: 'shayari', text: 'دل کی بات زبان پر آئی\nتو سب کچھ بدل گیا', english: 'When the heart spoke...', likes: 670, comments: 45, shares: 89, time: '2 weeks ago', trending: false },
    { id: 24, poetId: 8, poetName: 'Kishwar Naheed', category: 'ghazal', text: 'ہم تاریک راہوں میں\nچراغ جلانے والے ہیں', english: 'We are those who light lamps in dark paths...', likes: 1340, comments: 89, shares: 198, time: '2 weeks ago', trending: false },
    { id: 25, poetId: 1, poetName: 'Mirza Ghalib', category: 'romantic', text: 'دل ہی تو ہے نہ سنگ و خشت درد سے بھر نہ آئے کیوں\nروئیں گے ہم ہزار بار کوئی ہمیں ستائے کیوں', english: 'It is only a heart, not stone or brick...', likes: 2670, comments: 198, shares: 445, time: '2 weeks ago', trending: true },
    { id: 26, poetId: 2, poetName: 'Allama Iqbal', category: 'pain', text: 'وطن کی فکر کر ناداں\nمسلم ہوں تو بدن سے نکل کے خون کا آخری قطرہ', english: 'Think of the homeland, O ignorant one...', likes: 3120, comments: 234, shares: 567, time: '2 weeks ago', trending: true },
    { id: 27, poetId: 3, poetName: 'Faiz Ahmed Faiz', category: 'motivational', text: 'ہم دیکھیں گے\nلازم ہے کہ ہم بھی دیکھیں گے', english: 'We shall see...', likes: 2340, comments: 178, shares: 389, time: '3 weeks ago', trending: true },
    { id: 28, poetId: 4, poetName: 'Parveen Shakir', category: 'islamic', text: 'اللہ کے نام سے شروع\nجو بہت مہربان بہت رحم والا ہے', english: 'In the name of Allah...', likes: 890, comments: 56, shares: 123, time: '3 weeks ago', trending: false },
    { id: 29, poetId: 5, poetName: 'Jaun Elia', category: 'friendship', text: 'دوست وہ جو دل کی بات سمجھے\nبغیر کہے سمجھ جائے', english: 'A friend who understands the heart...', likes: 1670, comments: 123, shares: 267, time: '3 weeks ago', trending: false },
    { id: 30, poetId: 6, poetName: 'Ahmad Faraz', category: 'life', text: 'زندگی گزر گئی\nمگر یادیں رہ گئیں', english: 'Life passed by...', likes: 1230, comments: 89, shares: 201, time: '3 weeks ago', trending: false },
    { id: 31, poetId: 7, poetName: 'Amjad Islam Amjad', category: 'sad', text: 'آنسو بہہ گئے\nدل ٹوٹ گیا', english: 'Tears flowed...', likes: 560, comments: 34, shares: 78, time: '1 month ago', trending: false },
    { id: 32, poetId: 8, poetName: 'Kishwar Naheed', category: 'romantic', text: 'محبت ایک احساس ہے\nجو دل میں بس جاتا ہے', english: 'Love is a feeling...', likes: 1120, comments: 78, shares: 167, time: '1 month ago', trending: false }
  ],

  heroSlides: [
    { id: 1, poemId: 1, image: getPlaceholderImage(1200, 400, 'Featured Ghazal'), title: 'Featured Ghazal' },
    { id: 2, poemId: 2, image: getPlaceholderImage(1200, 400, 'Poet of the East'), title: 'Poet of the East' },
    { id: 3, poemId: 5, image: getPlaceholderImage(1200, 400, 'Modern Poetry'), title: 'Modern Poetry' }
  ],

  mushairaEvents: [
    { id: 1, title: 'Ali Raza & Guest Poets', date: '2026-06-16', time: '8:00 PM', location: 'Karachi, Pakistan', live: true, registered: 1200, watching: 1200, likes: 1200, like_count: 1200, duration_minutes: 42, host: 'Ali Raza', tags: ['Poetry', 'Shayari', 'Urdu'], description: 'Opening Session — Live mushaira with guest poets' },
    { id: 2, title: 'Opening Session', date: '2026-06-16', time: '8:00 PM', location: 'Lahore, Pakistan', live: false, registered: 189, host: 'Ali Raza', tags: ['Poetry', 'Shayari'], description: 'Opening mushaira session with classical ghazals' },
    { id: 3, title: 'Nayi Awaaz', date: '2026-06-17', time: '7:30 PM', location: 'Islamabad, Pakistan', live: false, registered: 312, host: 'Parveen Shakir', tags: ['Poetry', 'Urdu'], description: 'Young poets showcase their best verses' },
    { id: 4, title: 'Youth Mushaira 2026', date: '2026-06-25', time: '6:00 PM', location: 'Islamabad, Pakistan', live: false, registered: 312, host: 'Parveen Shakir', tags: ['Poetry', 'Shayari', 'Urdu'], description: 'A celebration of young poetic voices' },
    { id: 5, title: 'Special Mushaira Night', date: '2026-05-14', time: '9:00 PM', location: 'Delhi, India', live: false, ended: true, views: 3100, likes: 890, like_count: 890, duration_minutes: 95, registered: 890, host: 'Faiz Ahmed Faiz', tags: ['Poetry', 'Shayari', 'Urdu'], description: 'An unforgettable night of ghazals and nazms' },
    { id: 6, title: 'Classical Ghazal Evening', date: '2026-05-10', time: '9:00 PM', location: 'Delhi, India', live: false, ended: true, views: 2400, likes: 560, like_count: 560, duration_minutes: 78, registered: 156, host: 'Mirza Ghalib', tags: ['Poetry', 'Ghazal'], description: 'Classical ghazal recitation under the stars' }
  ],

  voiceRooms: [
    { id: 1, title: 'Poetry Discussion Room', host: 'Jaun Elia', participants: 24, active: true, premium: false },
    { id: 2, title: 'Ghazal Lovers Club', host: 'Ahmad Faraz', participants: 18, active: true, premium: false },
    { id: 3, title: 'Premium Poetry Lounge', host: 'Mirza Ghalib', participants: 12, active: true, premium: true },
    { id: 4, title: 'Night Shayari Session', host: 'Parveen Shakir', participants: 31, active: true, premium: false }
  ],

  contests: [
    { id: 1, title: 'Best Ghazal Contest 2026', status: 'active', deadline: '2026-07-15', prize: '$500', entries: 234, premium: false },
    { id: 2, title: 'Young Poets Challenge', status: 'active', deadline: '2026-08-01', prize: '$300', entries: 156, premium: false },
    { id: 3, title: 'Premium Poetry Awards', status: 'active', deadline: '2026-07-30', prize: '$1000', entries: 89, premium: true },
    { id: 4, title: 'Winter Mushaira Winner', status: 'completed', winner: 'Ahmad Faraz', prize: '$400', entries: 312, premium: false }
  ],

  premiumFeatures: [
    { icon: '🚫', title: 'Ad-Free Experience', desc: 'Enjoy poetry without interruptions' },
    { icon: '💬', title: 'Unlimited Messages', desc: 'Chat without limits' },
    { icon: '🔖', title: 'Unlimited Bookmarks', desc: 'Save all your favorite poems' },
    { icon: '📖', title: 'Unlimited Reading', desc: 'Read as many poems as you want' },
    { icon: '👑', title: 'Premium Badge', desc: 'Show your premium status' },
    { icon: '✓', title: 'Verified Poet Badge', desc: 'Get verified as a poet' },
    { icon: '🎤', title: 'Create Mushaira Events', desc: 'Host your own mushaira' },
    { icon: '🎙️', title: 'Create Voice Rooms', desc: 'Start private poetry sessions' },
    { icon: '⬇️', title: 'Download Poems', desc: 'Save poems offline' },
    { icon: '🏆', title: 'Premium Contests', desc: 'Access exclusive contests' }
  ],

  premiumPlans: [
    { id: 'monthly', name: 'Monthly Plan', price: '$2.99', period: '/month', note: 'Cancel anytime', badge: null },
    { id: 'yearly', name: 'Yearly Plan', price: '$19.99', period: '/year', note: 'Save 44%', badge: 'Best Value' }
  ],

  ads: [
    { id: 1, type: 'header', title: 'Learn Urdu Calligraphy', image: getPlaceholderImage(728, 90, 'Learn Urdu Calligraphy'), link: '#/poems' },
    { id: 2, type: 'sidebar', title: 'Poetry Books Collection', image: getPlaceholderImage(300, 250, 'Poetry Books'), link: '#/categories' },
    { id: 3, type: 'feed', title: 'Discover Poetry', image: getPlaceholderImage(600, 200, 'Discover Poetry'), link: '#/poems' }
  ],

  sampleComments: [
    { id: 1, user: 'Areeb Khan', text: 'Beautiful verses! Truly touching.', time: '2 hours ago' },
    { id: 2, user: 'Sara Ahmed', text: 'Ghalib\'s words never fail to amaze.', time: '4 hours ago' },
    { id: 3, user: 'Ali Hassan', text: 'This ghazal speaks to my soul.', time: '6 hours ago' }
  ],

  sampleChats: [
    { id: 1, user: 'Mirza Ghalib', lastMessage: 'Thank you for appreciating my poetry!', time: '10:30 AM', unread: 2 },
    { id: 2, user: 'Parveen Shakir', lastMessage: 'Would you like to join the mushaira?', time: 'Yesterday', unread: 0 },
    { id: 3, user: 'Faiz Ahmed Faiz', lastMessage: 'Your comment was wonderful.', time: '2 days ago', unread: 1 }
  ],

  roomChatMessages: {
    1: [
      { from: 'Jaun Elia', text: 'Welcome everyone. Share a verse that moved you today.', time: 'Just now', type: 'host' },
      { from: 'Sara Ahmed', text: 'Jaun sahab, your ghazal on longing is unmatched.', time: '2 min ago' },
      { from: 'Ali Hassan', text: 'کوئی دم کا مہمان ہے عمر سراپا درد ہے', time: '1 min ago' }
    ],
    2: [
      { from: 'Ahmad Faraz', text: 'Ghazal lovers, recite your favorite couplet tonight.', time: 'Just now', type: 'host' },
      { from: 'Areeb Khan', text: 'رنجش ہی سہی دل ہی دکھانے کے لیے آ', time: '3 min ago' }
    ],
    3: [
      { from: 'Mirza Ghalib', text: 'Premium lounge is open. Elegant verse only.', time: 'Just now', type: 'host' }
    ],
    4: [
      { from: 'Parveen Shakir', text: 'Night shayari session has begun. Who will start?', time: 'Just now', type: 'host' },
      { from: 'Fatima Noor', text: 'وہ تو خوب تھا کہ آ گیا', time: '1 min ago' }
    ]
  },

  roomListeners: {
    1: ['Jaun Elia', 'Sara Ahmed', 'Ali Hassan', 'Areeb Khan', 'Fatima Noor'],
    2: ['Ahmad Faraz', 'Areeb Khan', 'Sara Ahmed', 'Hassan Raza'],
    3: ['Mirza Ghalib', 'Allama Iqbal', 'Faiz Ahmed Faiz'],
    4: ['Parveen Shakir', 'Fatima Noor', 'Sara Ahmed', 'Ali Hassan', 'Areeb Khan', 'Hassan Raza']
  },

  chatMessages: {
    1: [
      { from: 'them', text: 'Assalamualaikum! Thank you for following me.', time: '10:00 AM' },
      { from: 'me', text: 'Walaikum assalam! Your poetry is inspiring.', time: '10:15 AM' },
      { from: 'them', text: 'Thank you for appreciating my poetry!', time: '10:30 AM' }
    ],
    2: [
      { from: 'them', text: 'Hello! I noticed you liked my recent poem.', time: 'Yesterday' },
      { from: 'me', text: 'Yes, it was beautiful!', time: 'Yesterday' },
      { from: 'them', text: 'Would you like to join the mushaira?', time: 'Yesterday' }
    ],
    3: [
      { from: 'them', text: 'Your comment was wonderful.', time: '2 days ago' },
      { from: 'me', text: 'Thank you so much!', time: '2 days ago' }
    ]
  }
};

function getAllVoiceRooms() {
  if (SupabaseClient.isEnabled()) {
    return [...(window.REMOTE_VOICE_ROOMS || []), ...Storage.getCustomRooms()];
  }
  return [...APP_DATA.voiceRooms, ...Storage.getCustomRooms()];
}

function getAllMushairaEvents() {
  if (SupabaseClient.isEnabled()) {
    return window.REMOTE_MUSHAIRA_EVENTS || [];
  }
  return [...Storage.getCustomMushaira(), ...APP_DATA.mushairaEvents];
}

function getLiveMushairaEvents() {
  return getAllMushairaEvents().filter(e => e.live || e.paused || e.waiting);
}

function getMushairaEventById(id) {
  const pid = parseInt(id, 10);
  return getAllMushairaEvents().find(e => e.id === pid);
}

function getVoiceRoomById(id) {
  const rid = parseInt(id);
  return getAllVoiceRooms().find(r => r.id === rid);
}

function getPoetById(id) {
  // Seed/demo poets use small numeric ids — only treat the id as one of
  // those if it's actually numeric. (parseInt("3fa85f64-...") would
  // otherwise return 3 and accidentally match seed poet #3.)
  const numericId = /^\d+$/.test(String(id)) ? parseInt(id, 10) : null;
  const poet = numericId !== null ? APP_DATA.poets.find(p => p.id === numericId) : null;
  if (poet) {
    if (!poet.avatar) poet.avatar = getAvatarUrl(poet.name);
    return poet;
  }
  // Real Supabase-authored poets (UUID ids) aren't in the seed catalog —
  // synthesize a lightweight profile from poems of theirs we already have
  // loaded, so "View Profile" on a real author's poem resolves to them
  // instead of silently falling back to the current viewer's own dashboard.
  const authoredPoems = getAllPoems().filter(p => (p.poetId === id || p.ownerId === id) && p.poetName);
  if (!authoredPoems.length) return null;
  const realAvatar = authoredPoems.find(p => p.avatarUrl)?.avatarUrl;
  return {
    id,
    name: authoredPoems[0].poetName,
    avatar: realAvatar || getAvatarUrl(authoredPoems[0].poetName),
    bio: '',
    verified: false,
    followers: 0,
    following: 0,
    posts: authoredPoems.length,
    isRemote: true
  };
}

function getPoemById(id) {
  const pid = parseInt(id);
  const remote = (window.REMOTE_POEMS || []).find(p => p.id === pid);
  if (remote) return remote;
  const userPost = Storage.getUserPosts().find(p => p.id === pid);
  if (userPost) return userPost;
  return APP_DATA.poems.find(p => p.id === pid);
}

function getCategoryById(id) {
  return APP_DATA.categories.find(c => c.id === id);
}

function getPoemsByCategory(categoryId) {
  return APP_DATA.poems.filter(p => p.category === categoryId);
}

function getPoemsByPoet(poetId) {
  const numericId = /^\d+$/.test(String(poetId)) ? parseInt(poetId, 10) : null;
  return getAllPoems().filter(p =>
    p.poetId === poetId || p.ownerId === poetId || (numericId !== null && p.poetId === numericId)
  );
}

function getTrendingPoems() {
  return APP_DATA.poems.filter(p => p.trending);
}

function getLatestPoems() {
  return [...APP_DATA.poems].slice(0, 15);
}

function getTopPoets(period) {
  const sorted = [...APP_DATA.poets].sort((a, b) => b.followers - a.followers);
  return sorted;
}

function searchPoems(query) {
  const q = query.toLowerCase();
  return APP_DATA.poems.filter(p =>
    p.text.toLowerCase().includes(q) ||
    p.poetName.toLowerCase().includes(q) ||
    p.category.toLowerCase().includes(q) ||
    (p.english && p.english.toLowerCase().includes(q))
  );
}

function searchPoets(query) {
  const q = query.toLowerCase();
  return APP_DATA.poets.filter(p =>
    p.name.toLowerCase().includes(q) ||
    (p.bio && p.bio.toLowerCase().includes(q))
  );
}

APP_DATA.poets.forEach(p => { p.avatar = getAvatarUrl(p.name); });
APP_DATA.sampleComments.forEach(c => { c.avatar = getAvatarUrl(c.user); });
APP_DATA.sampleChats.forEach(c => { c.avatar = getAvatarUrl(c.user); });
